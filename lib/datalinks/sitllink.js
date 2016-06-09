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
