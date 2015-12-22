'use strict';

var
  log = require('../log.js').getLogger(__filename),
  config = require('../../config/config'),
  dgram = require('dgram'),
  crypto = require('crypto'),
  events = require('events'),
  dronedp = require('../dronedp'),
  redis = require('redis'),
  mongoose = require('mongoose'),
  User = mongoose.model('User'),
  Drone = mongoose.model('Drone'),

  DRONE_CONNECTION_TIME = 10;

module.exports = function() {
  var
    emitter = new events.EventEmitter(),
    redisClient = redis.createClient(),
    sessionTimers = {};

  // start the server
  var mavListener = dgram.createSocket('udp4');

  mavListener.bind(config.realtime.port, function() {
    log.info('[DL] Listening');

    // Main handler for incoming messages from drones.
    mavListener.on('message', function(msg, rinfo) {
      var
        sendAddr = rinfo.address,
        sendPort = rinfo.port;

      try {
        var decode = dronedp.parseMessage(msg);
      } catch(e) {
        log.warn('[DL] Parse Error: ', e);
      }

      // Update session
      var sessionKey = rinfo.address + ':' + rinfo.port + ':' + rinfo.family + ':' + decode.session;

      switch (decode.type) {
        case dronedp.OP_MAVLINK_TEXT: handleMavlink(decode.data); break;
        case dronedp.OP_STATUS:       handleOp(decode.data);      break;
        default: log.warn('[DL] Unknown Op:', decode.type);
      }

      //
      // Handle Op Messages
      //
      function handleOp(data) {
        switch(data.op) {
          case 'status': handleOpStatus(data); break;
          case 'connect': handleOpConnect(data); break;
          default: log.warn('[DL]', 'Unknown op: ', data.op);
        }
      }

      //
      // Status message. Send reply back to drone and reset session timeout.
      //
      function handleOpStatus(data) {
        redisClient.get(sessionKey, handleSession);

        function handleSession(err, reply) {
          if (err) {
            log.error('[DL]', err);
          } else if (!reply) {
            log.debug('[DL]', "Session doesn't exist:", sessionKey);
          } else {
            try {
              var statusObj = JSON.parse(reply);
            } catch (e) {
              log.error('[DL]', e);
              return;
            }

            // Reset session timeout
            if (sessionTimers[sessionKey]) {
              clearTimeout(sessionTimers[sessionKey]);
              sessionTimers[sessionKey] = setTimeout(
                handleSessionTimeout.bind({session: sessionKey, status: statusObj}), DRONE_CONNECTION_TIME * 1000);
            }

            // Send reply to drone
            var msg = dronedp.generateMsg(dronedp.OP_STATUS, decode.session, JSON.stringify(statusObj));
            mavListener.send(msg, 0, msg.length, sendPort, sendAddr);

            // Update client
            statusObj.session = sessionKey;
            emitter.emit('update', statusObj);
          }
        }
      }

      //
      // Connect Message. Attempt to create a new session.
      //
      function handleOpConnect(data) {
        var
          droneDoc = null,
          sessionUniq;
        processDrone(data, handleProcessed);

        function handleProcessed(err, drone) {
          if (!err) {
            droneDoc = drone;
            // create session
            sessionUniq = crypto.randomBytes(4).toString('hex');
            sessionKey = rinfo.address + ':' + rinfo.port + ':' + rinfo.family + ':' + sessionUniq;
            redisClient.get(sessionKey, handleSession);
          } else {
            log.error('[DL]', err);
          }
        }

        function handleSession(err, reply) {
          if (err) {
            log.error('[DL]', err);
          } else if (reply) {
            log.warn('[DL]', 'Duplicate Session:', sessionKey);
          } else {
            var statusObj = {
              state: 'online',
              error: decode.error || null,
              drone: droneDoc
            };

            // Create new session
            redisClient.set(sessionKey, JSON.stringify(statusObj));
            sessionTimers[sessionKey] = setTimeout(
              handleSessionTimeout.bind({session: sessionKey, status: statusObj}), DRONE_CONNECTION_TIME * 1000);

            // Send reply to drone
            var msg = dronedp.generateMsg(dronedp.OP_STATUS, sessionUniq, statusObj);
            mavListener.send(msg, 0, msg.length, sendPort, sendAddr);

            // Update client
            statusObj.session = sessionKey;
            emitter.emit('update', statusObj);
            emitter.emit('dbUpdate');
          }
        }
      }

      //
      // Handle session timeouts
      //
      function handleSessionTimeout() {
        log.debug('[DL]', 'Session Timeout:', this.session);
        redisClient.del(this.session);
        this.status.state = 'offline';
        this.session = null;
        emitter.emit('update', this.status);
      }

      //
      // Mavlink handling
      //
      function handleMavlink(data) {
        redisClient.get(sessionKey, handleSession);

        function handleSession(err, reply) {
          if (err) {
            log.error('[DL]', err);
          } else if (!reply) {
            log.debug('[DL]', "Session doesn't exist:", sessionKey);
          } else {
            try {
              var statusObj = JSON.parse(reply);
              // Send mavlink info to client
              emitter.emit('stream:mavlink', {payload: data, session: sessionKey, drone: statusObj.drone._id});
            } catch(e) {
              log.error('[DL]', e);
            }
          }
        }
      }

      //
      // Remove drone
      //
      emitter.removeDrone = function(drones, incoming) {
        redisClient.del(drones[incoming._id].session);
        drones[incoming._id] = {status: 'offline', session: null};
        log.debug('[DL]', 'Successfully deleted');
      }
    });
  });

  return emitter;
};

// Authenticate user and grabs drone from DB.
// If no drone exists, it creeates one.
function processDrone(data, cb) {
  var
    userDoc = null,
    droneDoc = null;

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
    .exec(getUser)
  ;

  //
  // Callbacks
  //

  function getUser(err, user) {
    if (err) {
      return cb(err);
    } else if (user && user.validPassword(data.password)) {
      userDoc = user;
      Drone
        .findOne({firmwareId: data.serialId})
        .exec(getDrone);
    } else {
      return cb('Invalid Credentials');
    }
  }

  function getDrone(err, drone) {
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

      drone.save(saveDrone);
    }
  }

  function saveDrone(err, drone) {
    if (err) {
      return cb('Error creating drone');
    }

    droneDoc = drone;
    userDoc.drones.push(drone._id);
    userDoc.save(updateUser);
  }

  function updateUser(err) {
    if (err) {
      return cb('Error updating user');
    }

    return cb(null, droneDoc);
  }
};
