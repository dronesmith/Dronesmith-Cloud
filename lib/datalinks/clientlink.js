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
  dronelink = require('./dronelink').Singleton(),
  sitlLink = require('./sitllink').Singleton(),
  codelauncher = require('../codelauncher'),
  mavlinkhelper = require('../mavlinkhelper'),

  HEARTBEAT_INTERVAL = 1;

function initClient(app, session) {
  // init clientside connection
  var io = require('socket.io').listen(app);
  var sharedsession = require('express-socket.io-session');

  // Links the realtime connection to the rest of the server.
  io.use(sharedsession(session, {
    autoSave: true
  }));

  return io;
}

function initSessionTable(session) {
  var onlineDrones = {};
  // Create the session table.
  if (!session.onlineDrones && session.userData) {
    var userDrones = session.userData.drones;

    for (var i = 0; i < userDrones.length; ++i) {
      onlineDrones[userDrones[i]] = {status: 'offline', session: null, gcBroadcast: false, terminalinfo: null};
    }
  } else {
    return null;
  }
  return onlineDrones;
}

module.exports = function(app, session) {

  var io = initClient(app, session);

  // Frontend link.
  io.on('connection', function(socket) {
    var
      handshake = socket.handshake,
      addr = handshake.address,
      session = handshake.session;

    var udp = require('dgram');
    var gcsConnection = null;
    var gcsIp = null;

    // User must be logged in.
    if (!session.userData) {
      socket.disconnect();
      return;
    }

    log.info('[IO] Connect at', addr);

    // Init session look up table
    session.onlineDrones = initSessionTable(session);

    // Send status updates periodically
    var hb = setInterval(function() {

      // Empty object indicates no online drones, null indiciates there was an issue
      // getting the data.
      if (session.onlineDrones === null) {
        session.onlineDrones = initSessionTable(session);
      }

      socket.emit('hb', session.onlineDrones);
    }, HEARTBEAT_INTERVAL * 1000);

    //
    // Socket Events
    //

    // Request was sent from client to delete a drone.
    // NOTE the drone is not deleted from the DB this way.
    // This only removes the drone from the associated session.
    socket.on('drone:delete', onDroneDelete);
    socket.on('drone:code', onDroneCode);
    socket.on('drone:terminal', onDroneTerminal);
    socket.on('drone:gcs', onDroneGCS);

    socket.on('error', onSocketError);

    socket.on('disconnect', function() {
      log.info('[IO] Disconnect at', addr);

      // If there's any drones with an open terminal, kill them
      // for (var k in session.onlineDrones) {
      //   var drone = session.onlineDrones[k];
      //
      //   if (drone.status == 'online') {
      //     session.onlineDrones[k].terminalInfo = null;
      //     dronelink.sendTerminal(drone.session, false);
      //   }
      // }

      // Clean up.
      clearInterval(hb);
      socket.removeListener('drone:delete', onDroneDelete);
      socket.removeListener('error', onSocketError);
      socket.removeListener('drone:code', onDroneCode);
      socket.removeListener('drone:terminal', onDroneTerminal);
      socket.removeListener('drone:gcs', onDroneGCS);
      dronelink.removeListener('update', onSessionUpdate);
      dronelink.removeListener('dbUpdate', onDatabaseUpdate);
      dronelink.removeListener('stream:mavlink', onMavlinkData);
      dronelink.removeListener('code:status', onCodeUpdate);
      dronelink.removeListener('terminal:info', onTerminalUpdate);
      sitlLink.removeListener('sitl:mavlink', onSITLData);
      codelauncher.getEmitter().removeListener('code:update', onCodeUpdate);
    });

    //
    // Drone Link Events
    //
    dronelink.on('update',          onSessionUpdate);
    dronelink.on('dbUpdate',        onDatabaseUpdate);
    dronelink.on('stream:mavlink',  onMavlinkData);
    dronelink.on('code:status',     onCodeUpdate);
    dronelink.on('terminal:info',   onTerminalUpdate);

    //
    // SITL Events
    //
    sitlLink.on('sitl:mavlink',     onSITLData);

    //
    // Code Events
    //
    codelauncher.getEmitter().on('code:update', onCodeUpdate);

    //
    // Event Handlers
    //
    function onSocketError(error) {
      log.warn('[IO]', error);
    }

    function onDroneDelete(data) {
      dronelink.removeDrone(session.onlineDrones, data);
    }

    function onDroneTerminal(data) {
      var drone = session.onlineDrones[data.drone];

      if (drone && drone.status === 'online') {
        dronelink.sendTerminal(session.onlineDrones[data.drone].session, data.enable);

        if (!data.enable) {
          session.onlineDrones[data.drone].terminalInfo = null;
        }
      }
    }

    function onDroneCode(data) {
      if (session.onlineDrones[data.drone]
        && session.onlineDrones[data.drone].status === 'online') {

        dronelink.sendCode(session.onlineDrones[data.drone].session, data.code);
      } else {
        socket.emit('sim:output', "Drone not online.");
      }
    }

    function onSessionUpdate(data) {
      var userData = session.userData;

      if (session.onlineDrones) {
        session.onlineDrones[data.drone._id] = {
          status: data.state,
          session: data.session,
          code: data.codeStatus,
          gcBroadcast: !!gcsConnection,
          terminalInfo: data.terminalInfo || null
        };
      }
    }

    function onDroneGCS(data) {
      var drone = session.onlineDrones[data.drone];

      if (data.enable && drone && drone.gcBroadcast == false) {
        // open connection
        gcsConnection = udp.createSocket('udp4');
        gcsIp = session.userData.ipAddr;

        // fix for ipv6
        if (gcsIp == '::1') {
          gcsIp = 'localhost';
        }

        session.onlineDrones[data.drone].gcBroadcast = true;
        console.log('[IO]', 'Broadcasting to', gcsIp);
      } else if (!data.enable && drone && drone.gcBroadcast == true) {
        // close connection
        if (gcsConnection) {
          gcsConnection.close();
          gcsConnection = null;
          gcsIp = null;
        }
        session.onlineDrones[data.drone].gcBroadcast = false;
        console.log('[IO]', 'Broadcast on ', gcsIp, 'stopped.');
      }
    }

    function onDatabaseUpdate(data) {
      socket.emit('update');
    }

    function onMavlinkData(data) {
      if (session.onlineDrones === null) {
        log.warn("[IO] Onlinedrones object is null?")
        session.onlineDrones = initSessionTable(session);
      } else if (session.onlineDrones[data.drone].session == data.session) {
        socket.emit('mavlink', data);

        if (gcsConnection) {
          mavlinkhelper
            .getMav()
            .createMessage(data.payload.header, data.payload.data, function(message) {
              gcsConnection.send(message.buffer, 0, message.buffer.length, 14550, gcsIp);
          });
        }
      }
    }

    function onSITLData(data) {
      socket.emit('sim:mavlink', data);
    }

    function onTerminalUpdate(data) {
      if (data.msg) {
        if (session.onlineDrones[data.drone._id].session == data.session) {
          session.onlineDrones[data.drone._id].terminalInfo = data.msg;
          socket.emit('terminal:update', data);
        }
      }
    }

    function onCodeUpdate(data) {
      if (data.msg) {
        if (session.onlineDrones[data.drone._id].session == data.session) {
          socket.emit('sim:output', data.msg);
        }
      } else {
        socket.emit('sim:output', data);
      }
    }

  });
};
