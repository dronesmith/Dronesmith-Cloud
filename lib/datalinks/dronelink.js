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
  mavlinkhelper = require('../mavlinkhelper'),
  User = mongoose.model('User'),
  Drone = mongoose.model('Drone'),

  DRONE_CONNECTION_TIME = 30;

var instance = null;

exports.Singleton = function() {
  if (!instance) {
    instance = init();
  }

  return instance;
};

function init() {
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
      } catch (e) {
        log.warn('[DL] Parse Error: ', e);
	      return;
      }

      // Update session
      var sessionKey = rinfo.address + ':' + rinfo.port + ':' + rinfo.family + ':' + decode.session;

      switch (decode.type) {
        case dronedp.OP_MAVLINK_BIN:  handleBinaryMavlink(decode.data); break;
        case dronedp.OP_MAVLINK_TEXT: handleMavlink(decode.data); break;
        case dronedp.OP_STATUS:       handleOp(decode.data);      break;
        default: log.warn('[DL] Unknown Op:', decode.type);
      }

      //
      // Handle Op Messages
      //
      function handleOp(data) {
        switch (data.op) {
          case 'status':    handleOpStatus(data);   break;
          case 'connect':   handleOpConnect(data);  break;
          case 'code':      handleOpCode(data);     break;
          case 'terminal':  handleOpTerminal(data); break;
          default: log.warn('[DL]', 'Unknown op: ', data.op);
        }
      }

      //
      // When code is running, this will send back status messages.
      //
      function handleOpCode(data) {
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

            // got an ack from the client, so stop trying to upload the code.
            if (statusObj.codeBuffer != null) {
              statusObj.codeBuffer = null;
              redisClient.set(sessionKey, JSON.stringify(statusObj));
            }

            emitter.emit('code:status',
              {msg: data.msg, status: data.status,
                drone: statusObj.drone, session: sessionKey});
          }
        }
      }

      //
      //   {op: 'terminal', msg: info, status: terminalOnline});
      //
      function handleOpTerminal(data) {
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

            statusObj.terminalInfo = data.msg;
            redisClient.set(sessionKey, JSON.stringify(statusObj));

            //
            // send terminal info to client handler
            //
            emitter.emit('terminal:info',
              {msg: data.msg, status: data.status,
                drone: statusObj.drone, session: sessionKey});
          }
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
            //log.debug('[DL]', "Session doesn't exist:", sessionKey);
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
            var msg = dronedp.generateMsg(dronedp.OP_STATUS, decode.session, statusObj);
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
          userDoc = null,
          sessionUniq;
        processDrone(data, handleProcessed);

        function handleProcessed(err, drone, user) {
          if (!err) {
            droneDoc = drone;
            userDoc = user;
            // create session
            sessionUniq = crypto.randomBytes(4).readUInt32BE(0);
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
              drone: droneDoc,
              user: userDoc._id
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
      // Binary MAVLink (requires some additional overhead)
      //
      function handleBinaryMavlink(data) {
        redisClient.get(sessionKey, handleSession);

        function handleSession(err, reply) {
          if (err) {
            log.error('[DL]', err);
          } else if (!reply) {
            //log.debug('[DL]', "Session doesn't exist:", sessionKey);
          } else {

            mavlinkhelper.parseBinary(data, function(err, res) {
              if (err) {
                log.error('[DL]', e);
              } else {
                try {
                  var statusObj = JSON.parse(reply);
                  // Send mavlink info to client
                  emitter.emit('stream:mavlink', {payload: res, session: sessionKey, drone: statusObj.drone._id});
                } catch (e) {
                  log.error('[DL]', e);
                }
              }
            });
          }
        }
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
            } catch (e) {
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
      };

      //
      // Send terminal remote request
      //
      emitter.sendTerminal = function(session, enable) {
        redisClient.get(session, handleSession);

        function handleSession(err, reply) {
          if (err) {
            log.error('[DL]', err);
          } else if (!reply) {
            log.debug('[DL]', "Session doesn't exist:", sessionKey);
          } else {
            try {
              var statusObj = JSON.parse(reply);

              console.log('[DL] sending TERMINAL [' + enable + '] command to', session);
              statusObj.terminal = enable;

              if (!enable) {
                statusObj.terminalInfo = null;
              }
              redisClient.set(sessionKey, JSON.stringify(statusObj));
            } catch (e) {
              log.error('[DL]', e);
            }
          }
        }
      }

      //
      // Upload code to drone
      //
      emitter.sendCode = function(session, code) {
        redisClient.get(session, handleSession);

        function handleSession(err, reply) {
          if (err) {
            log.error('[DL]', err);
          } else if (!reply) {
            log.debug('[DL]', "Session doesn't exist:", sessionKey);
          } else {
            try {
              var statusObj = JSON.parse(reply);

              console.log('[DL] sending CODE to', session);

              // TODO - this will be an _id in Mongo, for now just encode the buffer.
              statusObj.codeBuffer = code;
              redisClient.set(sessionKey, JSON.stringify(statusObj));
            } catch (e) {
              log.error('[DL]', e);
            }
          }
        }
      };
    });
  });

  log.info("[DL] Init.");

  return emitter;
};

// Authenticate user and grabs drone from DB.
// If no drone exists, it creates one.
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
      return cb(null, drone, userDoc);
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

    return cb(null, droneDoc, userDoc);
  }
}
