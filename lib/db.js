'use strict';

var config = require('../config/config'),
    mongoose = require('mongoose'),
    redis = require('redis'),
    fs = require('fs'),
    log = require('./log.js').getLogger('');

var uri = 'mongodb://';
if (config.db.user !== '') {
    uri += config.db.user + ':' + config.db.pass + "@";
}
// uri += config.db.host + ':' + config.db.port + '/' + config.db.name;
// if (config.db.options.auth.authdb !== '') {
//     uri += '/?authSource=' + config.db.options.auth.authdb;
// }
mongoose.connect('mongodb://localhost/' + config.db.name, config.db.options);
mongoose.set("debug", config.db.debug);

mongoose.connection.on('error', function(err) {
    log.fatal('DB Connection error: ' + err);
});

mongoose.connection.on('connected', function() {
    log.debug('DB: Successful connection established.');
});

mongoose.connection.on('close', function() {
    log.debug('DB: Successful connection closed.');
});

process.on('SIGINT', function() {
    mongoose.connection.close(function () {
        log.debug('DB connection terminated.');
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
