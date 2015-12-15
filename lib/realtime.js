'use strict';

var
  config = require('../config/config'),
  dgram = require('dgram'),
  crypto = require('crypto'),
  events = require('events'),
  dronedp = require('./dronedp'),
  mavlinkhelper = require('./mavlinkhelper'),
  redis = require('redis'),
  mongoose = require('mongoose'),
  User = mongoose.model('User'),
  Drone = mongoose.model('Drone'),

  DRONE_CONNECTION_TIME = 10,
  SOCKET_IDLE_TIME = 60;

module.exports = function(app, session, url) {
  var io = require('socket.io').listen(app);
  var sharedsession = require("express-socket.io-session");
  var emitter = new events.EventEmitter();
  var client = redis.createClient();
  var sessionTimers = {};

  // Links the realtime connection to the rest of the server.
  io.use(sharedsession(session, {
    autoSave: true
  }));

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

  if (!url) {
    url = config.defaultAddress;
  }

  // mav.on('ready', function() {

  var sitlListener = dgram.createSocket('udp4');
  sitlListener.bind(config.sitl.port, function() {
    console.log('[SIM] Listening');

    sitlListener.on('message', function(msg, rinfo) {
      // All SITL messages are raw mavlink.
      mavlinkhelper.parseJSON(msg, function(err, result) {
        if (!err) {
          emitter.emit('sitl:mavlink', result);
        } else {
          console.log('[ERROR]', err);
        }
      });
    });
  });

    // start the server
    var mavListener = dgram.createSocket('udp4');
    mavListener.bind(config.realtime.port, function() {

        console.log('[RT] Listening');

        // Main handler for incoming messages from drones.
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

          // mavlink
          if (data.header) {
            sessionKey += ':' + decode.session;
            client.get(sessionKey, function(err, reply) {
              if (err) {
                console.log('[ERROR]', err);
              } else if (!reply) {
                console.log('[RT]', "Session doesn't exist.");
              } else {
                try {
                  var statusObj = JSON.parse(reply);
                  emitter.emit('stream:mavlink', {payload: data, session: sessionKey, drone: statusObj.drone._id});
                } catch(e) {
                  console.log('[ERROR]', e);
                }
              }
            });
          } else if (data.op) {
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

                    try {
                      var statusObj = JSON.parse(reply);
                    } catch (e) {
                      console.log('[ERROR]', e);
                      return;
                    }

                    if (sessionTimers[sessionKey]) {
                      clearTimeout(sessionTimers[sessionKey]);
                      sessionTimers[sessionKey] = setTimeout(function() {
                        console.log('[RT]', 'Session Timeout');
                        client.del(sessionKey);
                        statusObj.state = 'offline';
                        emitter.emit('update', statusObj);
                      }, DRONE_CONNECTION_TIME * 1000);
                    }
                    var msg = dronedp.generateMsg(dronedp.OP_STATUS, decode.session, JSON.stringify(statusObj));
                    mavListener.send(msg, 0, msg.length, sendPort, sendAddr);

                    // Update websockets
                    statusObj.session = sessionKey;
                    emitter.emit('update', statusObj);
                  }
                });
              break;

              // Connection request.
              case 'connect':
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
                          state: 'online',
                          error: decode.error || null,
                          drone: drone
                        };
                        client.set(sessionKey, JSON.stringify(newStatus));
                        sessionTimers[sessionKey] = setTimeout(function() {
                          console.log('[RT]', 'Session Timeout');
                          client.del(sessionKey);
                          newStatus.state = 'offline';
                          emitter.emit('update', newStatus);
                        }, DRONE_CONNECTION_TIME * 1000);
                        var msg = dronedp.generateMsg(dronedp.OP_STATUS, sessionUniq, newStatus);

                        mavListener.send(msg, 0, msg.length, sendPort, sendAddr);

                        // Update websockets
                        newStatus.session = sessionKey;
                        emitter.emit('update', newStatus);
                        emitter.emit('dbUpdate');
                      }
                    });
                  } else {
                    console.log('[ERROR]', err);
                  }
                });
                break;
            }
          }
        });
    });


  // });

  // Frontend realtime link.
  io.on('connection', function(socket) {
    console.log('[RT] Connect at', socket.handshake.address);

    socket.on('drone:delete', function(data) {
      var drones = socket.handshake.session.onlineDrones;

      client.del(drones[data._id].session);
      drones[data._id] = {status: 'offline', session: null};
      console.log('[RT]', 'Successfully deleted');

    });

    // Create the table
    if (!socket.handshake.session.onlineDrones && socket.handshake.session.userData) {
      var userDrones = socket.handshake.session.userData.drones;

      socket.handshake.session.onlineDrones = {};

      for (var i = 0; i < userDrones.length; ++i) {
        socket.handshake.session.onlineDrones[userDrones[i]] = {status: 'offline', session: null};
      }
    }

    var hb = setInterval(function() {

      socket.emit('hb', socket.handshake.session.onlineDrones);
    }, 1000);

    // emitter.on('mav_message', function(data) {
    //   socket.broadcast.emit('message', {time: new Date(), fields: data});
    // });

    // Sent when a session is created
    emitter.on('update', function(data) {
      var session = socket.handshake.session;
      var userData = session.userData;

      if (socket.handshake.session.onlineDrones) {
        socket.handshake.session.onlineDrones[data.drone._id] = {status: data.state, session: data.session};
      }

    });

    // Got update from the simulator
    emitter.on('sitl:mavlink', function(data) {
      socket.emit('sim:mavlink', data);
    });

    emitter.on('stream:mavlink', function(data) {
      if (socket.handshake.session.onlineDrones[data.drone].session == data.session) {
        socket.emit('mavlink', data);
      }
    });

    emitter.on('dbUpdate', function(data) {
      socket.emit('update');
    });

    socket.on('disconnect', function() {
      console.log('[RT] Disconnect at', socket.handshake.address);
      clearInterval(hb);
    });
  });
};
