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
  log = require('../log.js').getLogger(__filename),
  config = require('../../config/config'),
  dgram = require('dgram'),
  events = require('events'),
  mavlinkhelper = require('../mavlinkhelper');

var instance = null;

exports.Singleton = function() {
  if (!instance) {
    instance = init();
  }

  return instance;
}

function init() {
  var
    emitter = new events.EventEmitter(),
    sitlListener = dgram.createSocket('udp4');

  sitlListener.bind(config.sitl.port, function() {
    log.info('[SIM] Listening');

    sitlListener.on('message', function(msg, rinfo) {

      // All SITL messages are raw mavlink.
      mavlinkhelper.parseJSON(msg, function(err, result) {
        if (!err) {
          emitter.emit('sitl:mavlink', result);
        } else {
          log.error('[SIM]', err);
        }
      });
    });
  });

  return emitter;
}
