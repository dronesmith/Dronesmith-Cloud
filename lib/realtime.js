'use strict';

var
  config = require('../config/config'),
  dgram = require('dgram'),
  crypto = require('crypto'),
  mavlink = require('mavlink'),
  events = require('events'),
  dronedp = require('./dronedp'),
  redis = require('redis'),
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
  var client = redis.createClient();

  client.on("error", function (err) {
    console.log("Error " + err);
  });

  function processDrone(data, cb) {

    if (!data.serialId) {
      return cb('Firmware Id required');
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
          Drone
            .findOne({firmwareId: data.serialId})
            .exec(function(err, drone) {
              if (err) {
                return cb(err);
              } else if (drone) {
                // just send back the drone in the DB
                return cb(null, drone);
              } else {

                var drone = new Drone({
                  parameters: {},
                  firmwareId: data.serialId
                });

                drone.save(function(err, drone) {
                  if (err) {
                    console.log(err);
                    return cb('Error creating drone.');
                  }

                  user.drones.push(drone._id);
                  user.save(function(err) {
                    if (err) {
                      return cb('Error updating drone');
                    }

                    cb(null, drone);
                  });
                });
              }
            });
          } else {
            return cb("Invalid Credentials");
          }
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

        // var status = {
        //   op: 'status',
        //   error: null,
        //   drone: null
        // };

        mavListener.on('message', function(msg, rinfo) {

          var sendAddr = rinfo.address;
          var sendPort = rinfo.port;
          var sessionKey = rinfo.address + ':' + rinfo.port + ':' + rinfo.family;

          var decode = dronedp.parseMessage(msg);

          // Error during parsing.
          if (decode.error) {
            console.log(decode.error);
          }

          var data = decode.data;

          // See what kind of request the client is asking for
          if (data.op) {
            switch(data.op) {
              // Status request.
              case 'status':
                sessionKey += ':' + decode.session;
                client.get(sessionKey, function(err, reply) {
                  if (err) {
                    console.log('[ERROR]', err);
                  } else if (!reply) {
                    console.log('[RT]', "Session doesn't exist.");
                  } else {
                    var msg = dronedp.generateMsg(dronedp.OP_STATUS, decode.session, reply);
                    mavListener.send(msg, 0, msg.length, sendPort, sendAddr);
                  }
                });
              break;

              // Connection request.
              case 'connect':
                // TODO validate accounts
                processDrone(data, function(err, drone) {
                  if (!err) {
                    var sessionUniq = crypto.randomBytes(4).toString('hex');
                    sessionKey += ':' + sessionUniq;

                    client.get(sessionKey, function(err, reply) {
                      if (err) {
                        console.log('[ERROR]', err);
                      } else if (reply) {
                        console.log('[ERROR]', 'Duplicate Session');
                      } else {
                        var newStatus = {
                          state: 'idle',
                          error: decode.error || null,
                          drone: drone
                        };
                        client.set(sessionKey, JSON.stringify(newStatus));
                        var msg = dronedp.generateMsg(dronedp.OP_STATUS, sessionUniq, newStatus);
                        mavListener.send(msg, 0, msg.length, sendPort, sendAddr);
                      }
                    });
                  } else {
                    console.log('[ERROR]', err);
                  }
                });
                break;
            }
          }

          // // see if this session already exists
          // client.get(sessionKey, function(err, reply) {
          //   if (err) {
          //     console.log('[ERROR]', err);
          //   } else if (!reply) {
          //     // if no session, create it
          //     client.set(sessionKey, JSON.stringify({
          //       op: 'status',
          //       error: null,
          //       drone: null,
          //       state: 'idle'
          //     }));
          //   } else {
          //     var status = JSON.parse(reply);
          //     console.log('[RT]', sendAddr);
          //
          //     // Check drone info. Either get drone from DB, or make entry.
          //     if (!status.drone) {
          //       processDrone(decode);
          //     } else if (status.drone.firmwareId != decode.serialId) {
          //       processDrone(decode);
          //     }
          //
          //     if (decode.op) {
          //       switch(decode.op) {
          //         case 'status':
          //           var msg = dronedp.generateMsg(0x10, status);
          //           mavListener.send(msg, 0, msg.length, sendPort, sendAddr);
          //           status.error = null;
          //         break;
          //       }
          //     }
          //
          //     // Commit changes to session.
          //     client.set(sessionKey, JSON.stringify(status));

              // indicates model in DB needs to be updated.
              // emitter.on('updated', function(val) {
              //   status.drone = val;
              // });
              //
              // // add error to status object
              // emitter.on('error', function(val) {
              //   status.error = val;
              // });
              //
              // emitter.removeEvev
            // }
          // });
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
