var merge = require('merge'),
    fs = require('fs'),
    config = './properties.json',
    env = process.env.NODE_ENV || 'development',
    environmentSpecificPropertiesFile = './properties.' + env + '.json',
    properties, localProperties, environmentSpecificProperties = {};

properties = require(config);
if (fs.existsSync('./config/' + environmentSpecificPropertiesFile)) {
    environmentSpecificProperties = require(environmentSpecificPropertiesFile);
    properties = merge.recursive(true, properties, environmentSpecificProperties);
}

if (fs.existsSync('./config/properties.local.json')) {
    localProperties = require('./properties.local.json')
    properties = merge.recursive(true, properties, localProperties);
}

var exports = module.exports = properties;
