# probiotic

The simplified multi-workers daemon

[![NPM Downloads][npmdt-image]][npmdt-url]
[![NPM Version][npmv-image]][npmv-url]
[![GitHub Tag][ghtag-image]][ghtag-url]
[![GitHub License][ghlic-image]][ghlic-url]
[![Dependencies Status][david-image]][david-url]

(For a featureful cousin of _Probiotic_ see [_Progenic_](https://github.com/NicolaOrritos/progenic))


## Table of Contents

- [Table of Contents](#table-of-contents)
- [Getting Started](#getting-started)
- [Requirements](#requirements)
- [Options](#options)


## Getting Started

Install the module with: `npm install probiotic`  
Then use it in your code to start a service with as many workers as needed:

```js
const probiotic = require('probiotic');

probiotic.run({
    name:         'myServiceName',
    main:         'path/to/myServiceScript.js',
    logsBasePath: '/mnt/logs-volume',
    workers:      4
});
```

## Requirements

Probiotic requires [NodeJS](https://nodejs.org/) 4.5.0+ and can be istalled via NPM:
```Bash
npm install probiotic
# or:
npm install --save probiotic
```


## Options

The **mandatory** `name` parameter is the name the service will be started with.
It affects the process' PID file name (under _/var/run_) as well as the log files names.

The **mandatory** `main` parameter points to the JS file that is actually the service code.  
This code will be spawned exactly `workers`-times in different processes children of the service containing the probiotic code.

The **optional** `workers` parameter tells probiotic how many workers ave to be spawn.
When omitted probiotic will assume the value `'auto'`, spawning exactly `require('os').cpus().length - 1` workers (i.e. the number of CPUs of the system minus 1).

The **optional** `logsBasePath` parameter specifies the path where log files are created.
By default your service will have log files created under _/var/log_.  
Probiotic will create one log file for the master process and one for each of the children workers.



[npmdt-image]: https://img.shields.io/npm/dt/probiotic.svg  "NPM Downloads"
[npmdt-url]: https://www.npmjs.com/package/probiotic
[npmv-image]: https://img.shields.io/npm/v/probiotic.svg  "NPM Version"
[npmv-url]: https://www.npmjs.com/package/probiotic
[ghtag-image]: https://img.shields.io/github/tag/NicolaOrritos/probiotic.svg  "GitHub Tag"
[ghtag-url]: https://github.com/NicolaOrritos/probiotic/releases
[ghlic-image]: https://img.shields.io/github/license/NicolaOrritos/probiotic.svg  "GitHub License"
[ghlic-url]: https://github.com/NicolaOrritos/probiotic/releases
[david-image]: https://img.shields.io/david/NicolaOrritos/probiotic.svg  "David-dm.org Dependencies Check"
[david-url]: https://david-dm.org/NicolaOrritos/probiotic
