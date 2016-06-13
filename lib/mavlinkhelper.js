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

var
  log = require('./log.js').getLogger(__filename),
  config = require('../config/config'),
  events = require('events'),
  Mavlink = require('../lucikit/jsmavlink');

// Init
var mav = new Mavlink(config.mavlink.system, config.mavlink.component);
var emitter = new events.EventEmitter();

// Set up listeners
mav.on('ready', function () {
  log.info('[MAV] Ready');
  mav.on('messasge', function (msg) {
    emitter.emit('message', msg);
  });

  // All json message events reflected. Ensures we get all messages coming.
  emitter.setMaxListeners(Object.keys(mav.messagesByName).length);
  for (var k in mav.messagesByName) {
    mav.on(k, function (msg, data) {
      emitter.emit('jsonmessage', {header: mav.getMessageName(msg.id), data: data});
    });
  }

  // mav.on('HEARTBEAT', function(msg, data) {
  //   emitter.emit('jsonmessage', {header: mav.getMessageName(msg.id), data: data});
  // });

  mav.on('error', function (err) {
    emitter.emit('error', err);
  });
});

exports.parseBinarySync = function(buffer) {
  return mav.parseSync(buffer);
};

exports.parseBinary = function (buffer, cb) {
  mav.parse(buffer);
  var handleBin = function (msg) {
    emitter.removeListener('jsonmessage', handleBin);
    return cb(null, msg);
  };

  var handleBinError = function (err) {
    emitter.removeListener('error', handleError);
    return cb(err);
  };

  emitter.on('jsonmessage', handleBin);
  emitter.on('error', handleBinError);
};

exports.parseJSON = function (buffer, cb) {
  mav.parse(buffer);

  var handleJSON = function (msg) {
    emitter.removeListener('jsonmessage', handleJSON);
    return cb(null, msg);
  };

  var handleError = function (err) {
    emitter.removeListener('error', handleError);
    return cb(err);
  };

  emitter.on('jsonmessage', handleJSON);
  emitter.on('error', handleError);
};

exports.getMav = function() {
  return mav;
}
