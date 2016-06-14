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
    // redisClient = redis.createClient(),
    sessionsHash = {}, // FIXME quick fix until we can get to the bottom of this redis async situation
    sessionTimers = {};

  // start the server
  var mavListener = dgram.createSocket('udp4');

  mavListener.bind(config.realtime.port, function() {
    log.info('[DL] Listening');

    // Main handler for incoming messages from drones.
    mavListener.on('message', function(msg, rinfo) {
      // var
      //   sendAddr = rinfo.address,
      //   sendPort = rinfo.port;

      try {
        var decode = dronedp.parseMessage(msg);
      } catch (e) {
        log.warn('[DL] Parse Error: ', e);
	      return;
      }

      // Update session
      var sessionKey = rinfo.address + ':' + rinfo.port + ':' + rinfo.family + ':' + decode.session;

      switch (decode.type) {
        case dronedp.OP_MAVLINK_BIN:  handleBinaryMavlink(decode.data, sessionKey); break;
        case dronedp.OP_MAVLINK_TEXT: handleMavlink(decode.data, sessionKey); break;
        case dronedp.OP_STATUS:       handleOp(decode.data, sessionKey, rinfo.address, rinfo.port);      break;
        default: log.warn('[DL] Unknown Op:', decode.type);
      }

      //
      // Handle Op Messages
      //
      function handleOp(data, sess, addr, port) {
        switch (data.op) {
          case 'status':    handleOpStatus(data, sess, addr, port);   break;
          case 'connect':   handleOpConnect(data, sess, addr, port);  break;
          case 'code':      handleOpCode(data, sess);     break;
          case 'terminal':  handleOpTerminal(data, sess); break;
          default: log.warn('[DL]', 'Unknown op: ', data.op);
        }
      }

      //
      // When code is running, this will send back status messages.
      //
      function handleOpCode(data, sess) {
        // redisClient.get(sess, handleSession);

        if (sessionsHash[sess]) {
          var statusObj = sessionsHash[sess];

          if (statusObj.codeBuffer != null) {
            statusObj.codeBuffer = null;
            sessionsHash[sess] = statusObj;
          }

          emitter.emit('code:status',
            {msg: data.msg, status: data.status,
              drone: statusObj.drone, session: sess});
        }

        // function handleSession(err, reply) {
        //   if (err) {
        //     log.error('[DL]', err);
        //   } else if (!reply) {
        //     log.debug('[DL]', "Session doesn't exist:", sess);
        //   } else {
        //     try {
        //       var statusObj = JSON.parse(reply);
        //     } catch (e) {
        //       log.error('[DL]', e);
        //       return;
        //     }
        //
        //     // got an ack from the client, so stop trying to upload the code.
        //     if (statusObj.codeBuffer != null) {
        //       statusObj.codeBuffer = null;
        //       redisClient.set(sess, JSON.stringify(statusObj));
        //     }
        //
        //     emitter.emit('code:status',
        //       {msg: data.msg, status: data.status,
        //         drone: statusObj.drone, session: sess});
        //   }
        // }
      }

      //
      //   {op: 'terminal', msg: info, status: terminalOnline});
      //
      function handleOpTerminal(data, sess) {
        // redisClient.get(sess, handleSession);

        if (sessionsHash[sess]) {
          var statusObj = sessionsHash[sess];

          statusObj.terminalInfo = data.msg;
          sessionsHash[sess] = statusObj;

          //
          // send terminal info to client handler
          //
          emitter.emit('terminal:info',
            {msg: data.msg, status: data.status,
              drone: statusObj.drone, session: sess});
        }

        // function handleSession(err, reply) {
        //   if (err) {
        //     log.error('[DL]', err);
        //   } else if (!reply) {
        //     log.debug('[DL]', "Session doesn't exist:", sess);
        //   } else {
        //     try {
        //       var statusObj = JSON.parse(reply);
        //     } catch (e) {
        //       log.error('[DL]', e);
        //       return;
        //     }
        //
        //     statusObj.terminalInfo = data.msg;
        //     redisClient.set(sess, JSON.stringify(statusObj));
        //
        //     //
        //     // send terminal info to client handler
        //     //
        //     emitter.emit('terminal:info',
        //       {msg: data.msg, status: data.status,
        //         drone: statusObj.drone, session: sess});
        //   }
        // }
      }

      //
      // Status message. Send reply back to drone and reset session timeout.
      //
      function handleOpStatus(data, sess, addr, port) {
        // redisClient.get(sess, handleSession);

        if (sessionsHash[sess]) {
          var statusObj = sessionsHash[sess];

          if (sessionTimers[sess]) {
            clearTimeout(sessionTimers[sess]);
            sessionTimers[sess] = setTimeout(
              handleSessionTimeout.bind({session: sess, status: statusObj}), DRONE_CONNECTION_TIME * 1000);
          }

          // Send reply to drone
          var msg = dronedp.generateMsg(dronedp.OP_STATUS, decode.session, statusObj);
          mavListener.send(msg, 0, msg.length, port, addr);

          statusObj.cmdBuffer = null;
          sessionsHash[sess] = statusObj;

          // Update client
          statusObj.session = sess;
          emitter.emit('update', statusObj);
        }

        // function handleSession(err, reply) {
        //   if (err) {
        //     log.error('[DL]', err);
        //   } else if (!reply) {
        //     //log.debug('[DL]', "Session doesn't exist:", sessionKey);
        //   } else {
        //     try {
        //       var statusObj = JSON.parse(reply);
        //
        //     } catch (e) {
        //       log.error('[DL]', e);
        //       return;
        //     }
        //
        //     // Reset session timeout
        //     if (sessionTimers[sess]) {
        //       clearTimeout(sessionTimers[sess]);
        //       sessionTimers[sess] = setTimeout(
        //         handleSessionTimeout.bind({session: sess, status: statusObj}), DRONE_CONNECTION_TIME * 1000);
        //     }
        //
        //     if (statusObj.codeBuffer) {
        //       console.log("Sending code update to ", port, addr);
        //       // console.log(statusObj);
        //     }
        //
        //     // Send reply to drone
        //     var msg = dronedp.generateMsg(dronedp.OP_STATUS, decode.session, statusObj);
        //     mavListener.send(msg, 0, msg.length, port, addr);
        //
        //     // Update client
        //     statusObj.session = sess;
        //     emitter.emit('update', statusObj);
        //   }
        // }
      }

      //
      // Connect Message. Attempt to create a new session.
      //
      function handleOpConnect(data, sess, addr, port) {
        var
          droneDoc = null,
          userDoc = null,
          sessionUniq;

        console.log("Got firmware Id:", data.serialId);
        processDrone(data, handleProcessed);

        function handleProcessed(err, drone, user) {
          if (!err) {
            droneDoc = drone;
            userDoc = user;
            // create session
            sessionUniq = crypto.randomBytes(4).readUInt32BE(0);
            sess = rinfo.address + ':' + rinfo.port + ':' + rinfo.family + ':' + sessionUniq;
            // redisClient.get(sess, handleSession);

            var statusObj = {
              state: 'online',
              error: decode.error || null,
              drone: droneDoc,
              user: userDoc._id
            };

            sessionsHash[sess] = statusObj;

            sessionTimers[sess] = setTimeout(
              handleSessionTimeout.bind({session: sess, status: statusObj}), DRONE_CONNECTION_TIME * 1000);

            // Send reply to drone
            var msg = dronedp.generateMsg(dronedp.OP_STATUS, sessionUniq, statusObj);
            mavListener.send(msg, 0, msg.length, port, addr);

            // Update client
            // console.log("[DL] Updating client");
            statusObj.session = sess;
            emitter.emit('update', statusObj);
            emitter.emit('dbUpdate');

          } else {
            log.error('[DL]', err);
          }
        }

        // function handleSession(err, reply) {
        //   if (err) {
        //     log.error('[DL]', err);
        //   } else if (reply) {
        //     log.warn('[DL]', 'Duplicate Session:', sess);
        //   } else {
        //     var statusObj = {
        //       state: 'online',
        //       error: decode.error || null,
        //       drone: droneDoc,
        //       user: userDoc._id
        //     };
        //
        //     // Create new session
        //     redisClient.set(sess, JSON.stringify(statusObj));
        //     sessionTimers[sess] = setTimeout(
        //       handleSessionTimeout.bind({session: sess, status: statusObj}), DRONE_CONNECTION_TIME * 1000);
        //
        //     // Send reply to drone
        //     var msg = dronedp.generateMsg(dronedp.OP_STATUS, sessionUniq, statusObj);
        //     mavListener.send(msg, 0, msg.length, sendPort, sendAddr);
        //
        //     // Update client
        //     // console.log("[DL] Updating client");
        //     statusObj.session = sess;
        //     emitter.emit('update', statusObj);
        //     emitter.emit('dbUpdate');
        //   }
        // }
      }

      //
      // Handle session timeouts
      //
      function handleSessionTimeout() {
        log.debug('[DL]', 'Session Timeout:', this.session);
        sessionsHash[this.session] = null;
        // redisClient.del(this.session);
        this.status.state = 'offline';
        this.session = null;
        emitter.emit('update', this.status);
      }

      //
      // Binary MAVLink (requires some additional overhead)
      //
      function handleBinaryMavlink(data, sess) {
        // if (data[5] == 30) {
        //   console.log(s, " --- >", data);
        // }

        // redisClient.get(s, handleSession);

        if (sessionsHash[sess]) {
          var res = mavlinkhelper.parseBinarySync(data);
          if (res) {
                var statusObj = sessionsHash[sess];
                // Send mavlink info to client
                // console.log(s, " -> ", statusObj.drone._id);

                // if (res.header == 'ATTITUDE') {
                //   console.log(s);
                //   console.log(statusObj.drone._id, res);
                // }
                // console.log(res);

                emitter.emit('stream:mavlink', {payload: res, session: sess, drone: statusObj.drone._id});
            } else {
              log.error('[DL] Failed to parse binary MAVLink message.');
            }
        }

        // function handleSession(err, reply) {
        //   if (err) {
        //     log.error('[DL]', err);
        //   } else if (!reply) {
        //     //log.debug('[DL]', "Session doesn't exist:", s);
        //   } else {
        //
        //     mavlinkhelper.parseBinary(data, function(err, res) {
        //       if (err) {
        //         log.error('[DL]', e);
        //       } else {
        //         try {
        //           var statusObj = JSON.parse(reply);
        //           // Send mavlink info to client
        //           // console.log(s, " -> ", statusObj.drone._id);
        //
        //           // if (res.header == 'ATTITUDE') {
        //           //   console.log(s);
        //           //   console.log(statusObj.drone._id, res);
        //           // }
        //
        //           emitter.emit('stream:mavlink', {payload: res, session: s, drone: statusObj.drone._id});
        //         } catch (e) {
        //           log.error('[DL]', e);
        //         }
        //       }
        //     });
        //   }
        // }
      }

      //
      // Mavlink handling
      //
      function handleMavlink(data, sess) {
        // redisClient.get(sess, handleSession);

        if (sessionsHash[sess]) {
          var statusObj = sessionsHash[sess];
          emitter.emit('stream:mavlink', {payload: data, session: sess, drone: statusObj.drone._id});
        }

        // function handleSession(err, reply) {
        //   if (err) {
        //     log.error('[DL]', err);
        //   } else if (!reply) {
        //     // log.debug('[DL]', "Session doesn't exist:", sess);
        //   } else {
        //     try {
        //       var statusObj = JSON.parse(reply);
        //       // Send mavlink info to client
        //       emitter.emit('stream:mavlink', {payload: data, session: sess, drone: statusObj.drone._id});
        //     } catch (e) {
        //       log.error('[DL]', e);
        //     }
        //   }
        // }
      }

      //
      // Remove drone
      //
      emitter.removeDrone = function(drones, incoming) {
        if (drones[incoming._id]) {
          // redisClient.del(drones[incoming._id].session);
          sessionsHash[drones[incoming._id].session] = null;
          drones[incoming._id] = {status: 'offline', session: null};
          log.debug('[DL]', 'Successfully deleted');
        } else {
          log.warn('[DL] Tried to delete a null session!!');
        }
      };

      //
      // Send terminal remote request
      //
      emitter.sendTerminal = function(session, enable) {
        // redisClient.get(session, handleSession);

        if (sessionsHash[session]) {
          var statusObj = sessionsHash[session];

          console.log('[DL] sending TERMINAL [' + enable + '] command to', session);
          statusObj.terminal = enable;

          if (!enable) {
            statusObj.terminalInfo = null;
          }

          sessionsHash[session] = statusObj;
        }

        // function handleSession(err, reply) {
        //   if (err) {
        //     log.error('[DL]', err);
        //   } else if (!reply) {
        //     log.debug('[DL]', "Session doesn't exist:", sessionKey);
        //   } else {
        //     try {
        //       var statusObj = JSON.parse(reply);
        //
        //       console.log('[DL] sending TERMINAL [' + enable + '] command to', session);
        //       statusObj.terminal = enable;
        //
        //       if (!enable) {
        //         statusObj.terminalInfo = null;
        //       }
        //       redisClient.set(sessionKey, JSON.stringify(statusObj));
        //     } catch (e) {
        //       log.error('[DL]', e);
        //     }
        //   }
        // }
      }

      emitter.sendCommand = function(drone, command, params) {
        for (var key in sessionsHash) {
          var statusObj = sessionsHash[key];

          if (statusObj && statusObj.drone) {
            if (statusObj.drone._id == ''+drone._id) {
              console.log(command, drone.systemId, params);
              var result = mavlinkhelper.buildMsgSync(command, drone.systemId, params);
              if (!result) {
                log.warn("[DL] Failed to build message. Did you include all of the necessary data?");
                return false;
              } else {
                console.log(result);
                statusObj.cmdBuffer = result;
                sessionsHash[key] = statusObj;
                return true;
              }
            }
          }
        }

        log.warn("[DL] Session not found for drone", drone._id, "probably offline.");
        return false;
      }

      //
      // Upload code to drone
      //
      emitter.sendCode = function(session, code) {
        // redisClient.get(session, handleSession);

        if (sessionsHash[session]) {
          var statusObj = sessionsHash[session];

          console.log('[DL] sending CODE to', session);

          // TODO - this will be an _id in Mongo, for now just encode the buffer.
          statusObj.codeBuffer = code;
          sessionsHash[session] = statusObj;
        }

        // function handleSession(err, reply) {
        //   if (err) {
        //     log.error('[DL]', err);
        //   } else if (!reply) {
        //     log.debug('[DL]', "Session doesn't exist:", sessionKey);
        //   } else {
        //     try {
        //       var statusObj = JSON.parse(reply);
        //
        //       console.log('[DL] sending CODE to', session);
        //
        //       // TODO - this will be an _id in Mongo, for now just encode the buffer.
        //       statusObj.codeBuffer = code;
        //       redisClient.set(sessionKey, JSON.stringify(statusObj));
        //     } catch (e) {
        //       log.error('[DL]', e);
        //     }
        //   }
        // }
      };
    });
  });

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
