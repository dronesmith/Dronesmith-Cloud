'use strict';

var
  config = require('../config/config'),
  dgram = require('dgram'),
  mavlink = require('mavlink'),
  events = require('events'),
  MAV_HEADER = 1,
  MAV_COMPONENT = 1;

function processMessage() {

}

module.exports = function(app, url) {
  var mavListener = dgram.createSocket('udp4');
  var io = require('socket.io').listen(app);
  var emitter = new events.EventEmitter();
  var mav = new mavlink(MAV_HEADER, MAV_COMPONENT);

  if (!url) {
    url = config.defaultAddress;
  }

  // set up udp server
  mav.on('ready', function() {
    mavListener.bind(config.realtime.port, url, function(e) {
      mavListener.on('message', function(msg) {
        // console.log(msg);
        mav.parse(msg);
      });
    });

    // Reflecting the events because I'm tired of coding these by hand.
    for (var k in mav.messagesByName) {
      mav.on(k, function(msg, data) {
        emitter.emit('mav_message', {header: msg, data: data});
      });
    }
  });

  io.on('connection', function(socket) {
    console.log('[RT] Connect at', socket.handshake.address);
    // pulse every 90 seconds to let the connectee know we're alive
    var hb = setInterval(function() { socket.emit('heartbeat') }, 90000);

    emitter.on('mav_message', function(data) {
      socket.broadcast.emit('message', {time: new Date(), fields: data});
    });

    socket.on('disconnect', function() {
      console.log('[RT] Disconnect at', socket.handshake.address);
      clearInterval(hb);
    });
  });
};
