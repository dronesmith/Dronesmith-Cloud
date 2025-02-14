/**
 * Dronesmith Cloud
 *
 * Principle Engineer: Geoff Gardner <geoff@dronesmith.io>
 *
 * Copyright (C) 2016 Dronesmith Technologies Inc, all rights reserved.
 * Unauthorized copying of any source code or assets within this project, via
 * any medium is strictly prohibited.
 *
 * Proprietary and confidential.
 */

'use strict';

var config = require('../config/config'),
    mongoose = require('mongoose'),
    redis = require('redis'),
    fs = require('fs'),
    log = require('./log.js').getLogger(__filename);

var uri = 'mongodb://';
if (config.db.user !== '') {
    uri += config.db.user + ':' + config.db.pass + "@";
}
// uri += config.db.host + ':' + config.db.port + '/' + config.db.name;
// if (config.db.options.auth.authdb !== '') {
//     uri += '/?authSource=' + config.db.options.auth.authdb;
// }
mongoose.connect(config.db.url + config.db.name, config.db.options);
mongoose.set("debug", config.db.debug);

mongoose.connection.on('error', function(err) {
    log.fatal('[DB] Connection error: ' + err);
});

mongoose.connection.on('connected', function() {
    log.info('[DB] Connect Success');
});

mongoose.connection.on('close', function() {
    log.info('[DB] Connection Closed');
});

process.on('SIGINT', function() {
    mongoose.connection.close(function () {
        log.warn('[DB] Forcibly closed');
        process.exit(0);
    });
});

// register model objects
var modelsDir = __dirname + '/models';
fs.readdirSync(modelsDir).forEach(function (file) {
    if (/\.js$/.test(file)) {
        // log.debug('requiring model file: ' + file);
        require(modelsDir + '/' + file);
    }
});

// remove all session keys
var client = redis.createClient();
client.flushall();
