var config = require('../config/config'),
    pmongo = require('promised-mongo');

// Initialize and export Mongo Connection Pool
module.exports = pmongo(config.mongo.url);
