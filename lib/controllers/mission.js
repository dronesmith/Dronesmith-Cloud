'use strict';

var mongoose = require('mongoose'),
    User = mongoose.model('Mission'),
    log = require('../log.js').getLogger(__filename),
    Q = require('q'),
    async = require('async'),
    _ = require('underscore'),
    mailer = require('../mailer.js')(),
    crypto = require('crypto'),
    Qs = require('qs'),
    utils = require('../utils'),
    uuid = require('uuid'),
    sdlog = require('../sdlog.js')

    ;

exports.addMission = function(req, res, next) {
  var logRaw = new Buffer('');

  req.on('data', function(chunk) {
    logRaw = Buffer.concat([logRaw, chunk]);
  });

  req.on('end', function() {
    // process file
    sdlog.parse(logRaw);
    return  res.json({"status": "OK"});
  });
};

exports.removeMission = function() {
  // TODO
};

exports.find = function(req, res, next) {
  // TODO
};

exports.all = function(req, res, next) {
  // TODO
};
