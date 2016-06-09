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

var mongoose = require('mongoose'),
    git = require('../git.js'),
    log = require('../log.js').getLogger(__filename),
    Q = require('q'),
    async = require('async'),
    _ = require('underscore'),
    utils = require('../utils')
    ;

exports.findAll = function(req, res) {
  git.getDefaultRepo(function(data) {
    res.json(data);
  });
};
