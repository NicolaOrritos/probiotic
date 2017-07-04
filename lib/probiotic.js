
'use strict';

/**
 * @usage const probiotic = require('probiotic');
 *        probiotic.run({
 *            name:         'myserver',
 *            main:         'lib/mycode.js'
 *            logsBasePath: '/var/log',
 *            workers:      4
 *        });
 **/


const fs    = require('fs');
const path  = require('path');
const utils = require('./utils');


module.exports =
{
    run: function(options)
    {
        options = utils.normalizeOptions(options);

        if (options.name && options.main)
        {
            // Write master logs to file
            const fileName = options.name + '_' + 'master';
            const filePath = utils.buildLogFilePath(fileName, options.logsBasePath);

            const logFile = fs.openSync(filePath, 'a');

            // Daemonization happens here
            require('daemon')(
            {
                stdout: logFile,
                stderr: logFile,
                cwd:    process.cwd()
            });

            options.logger.info('[PROBIOTIC] Logging to "%s"...', options.logsBasePath);


            let basePath;

            if (module.parent.filename)
            {
                const filenameIndex = module.parent.filename.lastIndexOf('/');
                basePath = module.parent.filename.slice(0, filenameIndex);
            }
            else
            {
                basePath = __dirname;
            }

            if (basePath)
            {
                options.logger.info('[PROBIOTIC] Changing to folder "%s"...', basePath);

                process.chdir(basePath);
            }

            options.main = path.join(basePath, options.main);

            /**
             * Gracefully shuts down the workers
             */
            process.on('SIGTERM', () =>
            {
                utils.killAllWorkers('SIGTERM')
                .then( () =>
                {
                    options.logger.info('[PROBIOTIC] Gracefully shut down all workers. Now exiting...');

                    process.exit(0);
                })
                .catch( err =>
                {
                    options.logger.fatal('[PROBIOTIC] Could not kill workers! %s', err);

                    process.exit(1);
                });
            });

            process.on('exit', code => options.logger.info('[PROBIOTIC] Exiting with code "%s"...', code) );

            process.on('warning', warning =>
            {
                options.logger.warn('[PROBIOTIC] %s: %s', warning.name, warning.message);
                options.logger.warn('[PROBIOTIC] %s',     warning.stack);
            });

            options.logger.info('[PROBIOTIC] Main process PID is "%s"', process.pid);

            // Create a child for each CPU
            utils.createWorkers(options)
            .then( () => options.logger.info('[PROBIOTIC] All workers have been started') )
            .catch( err => options.logger.error('[PROBIOTIC] Could not start workers. %s', err) );
        }
        else
        {
            throw new Error('Missing "name" and "main" required options');
        }
    }
};
