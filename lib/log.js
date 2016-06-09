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
	log4js = require('log4js'),
	path = require('path');

log4js.loadAppender('file');
log4js.loadAppender('console');

log4js.addAppender(log4js.appenders.file(path.join(config.log.path, config.log.filename)));
log4js.setGlobalLogLevel(config.log.level);

exports = module.exports = log4js;
