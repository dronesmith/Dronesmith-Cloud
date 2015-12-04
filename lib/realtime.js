'use strict';

var
  config = require('../config/config'),
  dgram = require('dgram'),
  mavlink = require('mavlink'),
  events = require('events'),
  dronedp = require('./dronedp'),
  mongoose = require('mongoose'),
  User = mongoose.model('User'),
  Drone = mongoose.model('Drone'),
  SOCKET_IDLE_TIME = 60,
  MAV_HEADER = 1,
  MAV_COMPONENT = 1;

module.exports = function(app, url) {
  var io = require('socket.io').listen(app);
  var emitter = new events.EventEmitter();
  var mav = new mavlink(MAV_HEADER, MAV_COMPONENT);

  function processNewDrone(data) {

    if (!data.serialId) {
      return emitError('Firmware Id required');
    }

    Drone
      .findOne({firmwareId: data.serialId})
      .exec(function(err, drone) {
        if (err) {
          return emitError(err);
        } else if (drone) {
          return emitError('Duplicate serialId');
        }

        User
          .findOne({email: data.email})
          .select({
            email: 1,
            cryptPass: 1,
            cryptSalt: 1,
            drones: 1
          })
          .exec(function(err, user) {
            if (!err && user && user.validPassword(data.password)) {

              var drone = new Drone({
                parameters: {},
                firmwareId: data.serialId
              });

              drone.save(function(err, drone) {
                if (err) {
                  console.log(err);
                  return emitError('Error creating drone.');
                }

                user.drones.push(drone._id);
                user.save(function(err) {
                  if (err) {
                    return emitError('Error updating drone');
                  }

                  emitter.emit('updated', drone);
                });
              });
            } else {
              emitError("Invalid Credentials");
            }
          })
        ;
      })
    ;
  };

  function emitError(string) {
    emitter.emit('error', string);
  }

  if (!url) {
    url = config.defaultAddress;
  }

  mav.on('ready', function() {

    // start the server
    var mavListener = dgram.createSocket('udp4');
    mavListener.bind(config.realtime.port, function() {

        console.log('[RT] Listening');

        var status = {
          op: 'status',
          error: null,
          drone: null
        };

        mavListener.on('message', function(msg, rinfo) {

          var sendAddr = rinfo.address;
          var sendPort = rinfo.port;
          var decode = dronedp.parseMessage(msg);

          console.log('[RT]', sendAddr);

          if (decode.error) {
            status.error = decode.error;
          }
          if (decode.op) {
            switch(decode.op) {
              case 'new':
                processNewDrone(decode);
              break;
              case 'status':
                var msg = dronedp.generateMsg(0x10, status);
                mavListener.send(msg, 0, msg.length, sendPort, sendAddr);
                status.error = null;
              break;
            }
          }
        });

        // indicates model in DB needs to be updated.
        emitter.on('updated', function(val) {
          status.drone = val;
        });

        // add error to status object
        emitter.on('error', function(val) {
          status.error = val;
        });
    });

    // Reflecting the events because I'm tired of coding these by hand.
    for (var k in mav.messagesByName) {
      mav.on(k, function(msg, data) {
        emitter.emit('mav_message', {header: msg, data: data});
      });
    }
  });

  // Frontend realtime link.
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
