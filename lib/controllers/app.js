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
