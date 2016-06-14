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

// type CommandLong struct {
// 	Param1          float32 // Parameter 1, as defined by MAV_CMD enum.
// 	Param2          float32 // Parameter 2, as defined by MAV_CMD enum.
// 	Param3          float32 // Parameter 3, as defined by MAV_CMD enum.
// 	Param4          float32 // Parameter 4, as defined by MAV_CMD enum.
// 	Param5          float32 // Parameter 5, as defined by MAV_CMD enum.
// 	Param6          float32 // Parameter 6, as defined by MAV_CMD enum.
// 	Param7          float32 // Parameter 7, as defined by MAV_CMD enum.
// 	Command         uint16  // Command ID, as defined by MAV_CMD enum.
// 	TargetSystem    uint8   // System which should execute the command
// 	TargetComponent uint8   // Component which should execute the command, 0 for all components
// 	Confirmation    uint8   // 0: First transmission of this command. 1-255: Confirmation transmissions (e.g. for kill command)
// }

exports.buildMsgSync = function(cmd, target, data) {

  if (!cmd || !target || !data) {
    return null;
  }

  return {
    'Confirmation':         0,
    'TargetComponent':      1,
    'TargetSystem':         target,
    'Command':              parseInt(mav.getMissionID(cmd)),
    'Param1':               data.param1 || 0.0,
    'Param2':               data.param2 || 0.0,
    'Param3':               data.param3 || 0.0,
    'Param4':               data.param4 || 0.0,
    'Param5':               data.param5 || 0.0,
    'Param6':               data.param6 || 0.0,
    'Param7':               data.param7 || 0.0
  };

  // return mav.createMessageSync("COMMAND_LONG", {
  //   'target_system':        target,
  //   'target_component':     1,
  //   'command':              mav.getMissionID(cmd),
  //   'confirmation':         0,
  //   'param1':               data.param1 || 0.0,
  //   'param2':               data.param2 || 0.0,
  //   'param3':               data.param3 || 0.0,
  //   'param4':               data.param4 || 0.0,
  //   'param5':               data.param5 || 0.0,
  //   'param6':               data.param6 || 0.0,
  //   'param7':               data.param7 || 0.0
  // });
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
