'use strict';

var config = require('../config/config'),
	log4js = require('log4js'),
	path = require('path');

log4js.loadAppender('file');
log4js.loadAppender('console');

log4js.addAppender(log4js.appenders.file(path.join(config.log.path, config.log.filename)));
log4js.setGlobalLogLevel(config.log.level);

exports = module.exports = log4js;
