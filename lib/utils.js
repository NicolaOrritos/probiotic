
'use strict';

const fs      = require('fs');
const path    = require('path');
const cluster = require('cluster');


const helpers =
{
    buildLogFilePath: function(fileName, basePath)
    {
        if (fileName)
        {
            basePath = basePath || '/var/log';

            const filePath = path.resolve(path.join(basePath, fileName + '.log'));

            return filePath;
        }
        else
        {
            throw new Error('Missing parameters');
        }
    },

    createLogFile: function(fileName, logsBasePath)
    {
        if (fileName)
        {
            const filePath = helpers.buildLogFilePath(fileName, logsBasePath);

            const stream = fs.createWriteStream(filePath, {flags: 'a', encoding: 'utf8'});

            /* Only log errors, because they can be caused by the process trying to log
             * atfer the stream has already been closed and the whole process is being brougth down;
             * Re-throwing them may cause the master process to crash with an unhandled exception,
             * typically a "write after end" one. */
            stream.on('error', err => console.log('Error on write stream "%s". %s', filePath, err) );

            return stream;
        }
        else
        {
            throw new Error('Missing parameters');
        }
    },

    writePidFile: function(name, log)
    {
        const pid     = process.pid.toString();
        const pidPath = '/var/run/' + name + '.pid';

        fs.writeFile(pidPath, pid, err =>
        {
            if (err)
            {
                log.fatal('[PROBIOTIC] Could not write PID file. Cause: %s', err);
            }
        });
    },

    /**
     * Relays messages received from the workers up to the calling process.
     *
     * @param  {Object} msg The message to be relayed.
     */
    relayMessage: function(msg)
    {
        // When child process.send is undefined
        if (cluster.isMaster && process.send)
        {
            process.send(msg);
        }
    },

    forkWorker: function(name, log, logsBasePath)
    {
        return new Promise( (resolve, reject) =>
        {
            if (name && log)
            {
                const worker = cluster.fork();

                // Write logs to file
                const fileName = name + '_' + worker.id;
                const logFile  = helpers.createLogFile(fileName, logsBasePath);
                worker.process.stdout.pipe(logFile);
                worker.process.stderr.pipe(logFile);

                worker.on('message', helpers.relayMessage);

                worker.on('listening', () => resolve(worker.id) );

                worker.on('exit', (code, signal) =>
                {
                    if (code === 0 || signal === 'SIGTERM')
                    {
                        log.info('[PROBIOTIC] Worker "%s" gracefully shut down with code "%d" :)', worker.id, code);
                    }
                    else
                    {
                        log.error('[PROBIOTIC] Worker "%s" died with code "%d" and signal "%s" :(', worker.id, code, signal);
                    }

                    log.info('[PROBIOTIC] No worker will be started in its stead');
                });
            }
            else
            {
                reject(new Error('Missig parameters "name" and/or "log"'));
            }
        });
    }
};


module.exports =
{
    CONSOLE_LOGGER:
    {
        trace: console.trace,
        debug: console.log,
        info:  console.info,
        warn:  console.warn,
        error: console.error,
        fatal: console.error
    },

    normalizeOptions: function(options)
    {
        // Options are: name, main, workers, logger
        const result = {};

        if (options)
        {
            result.name = options.name;
            result.main = options.main;

            // Number of CPUs when no number provided
            result.workers = options.workers || 'auto';

            if (isNaN(result.workers) && result.workers !== 'auto')
            {
                result.workers = 'auto';
            }

            // When "auto", try to spawn NUM_CPUs - 1 workers:
            if (result.workers === 'auto')
            {
                result.workers = Math.max(1, (require("os").cpus().length - 1));
            }

            result.logger = options.logger || module.exports.CONSOLE_LOGGER;

            result.logsBasePath = '/var/log';
        }

        return result;
    },

    buildLogFilePath: helpers.buildLogFilePath,

    createLogFile: helpers.createLogFile,

    createWorkers: function(options)
    {
        return new Promise( (resolve, reject) =>
        {
            if (options)
            {
                options.logger.info('[PROBIOTIC] Starting "%s" daemon with %s workers...', options.name, options.workers);
                options.logger.info('[PROBIOTIC] [from "%s"]', options.main);

                // Write the PID file:
                helpers.writePidFile(options.name, options.logger);

                cluster.setupMaster(
                {
                    exec: path.join(__dirname, 'worker.js'),
                    args: [options.main],
                    silent: true
                });

                const promises = [];

                let count = options.workers;

                while (count-- > 0)
                {
                    options.logger.info('[PROBIOTIC] Creating  worker #%s...', (options.workers - count));

                    promises.push(helpers.forkWorker(options.name, options.logger, options.logsBasePath, options.checkPingsEnabled));
                }

                Promise.all(promises)
                .then(resolve)
                .catch(reject);
            }
            else
            {
                reject(new Error('Missing options'));
            }
        });
    },

    /**
     * Kills all workers with the given signal.
     * @param  {Number} signal
     */
    killAllWorkers: function(signal)
    {
        return new Promise( resolve =>
        {
            for (let uniqueID in cluster.workers)
            {
                if (cluster.workers.hasOwnProperty(uniqueID))
                {
                    const worker = cluster.workers[uniqueID];

                    worker.kill(signal);
                }
            }

            resolve();
        });
    }
};
