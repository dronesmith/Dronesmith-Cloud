'use strict';

var
  log = require('../log.js').getLogger(__filename),
  dronelink = require('./dronelink')(),

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
  // Create the session table.
  if (!session.onlineDrones && session.userData) {
    var userDrones = session.userData.drones;

    session.onlineDrones = {};

    for (var i = 0; i < userDrones.length; ++i) {
      session.onlineDrones[userDrones[i]] = {status: 'offline', session: null};
    }
  }
}

module.exports = function(app, session) {

  var io = initClient(app, session);

  // Frontend link.
  io.on('connection', function(socket) {
    var
      handshake = socket.handshake,
      addr = handshake.address,
      session = handshake.session;

    log.info('[IO] Connect at', addr);

    // Init session look up table
    initSessionTable(session);

    // Send status updates periodically
    var hb = setInterval(function() {
      socket.emit('hb', socket.handshake.session.onlineDrones);
    }, HEARTBEAT_INTERVAL * 1000);

    //
    // Socket Events
    //

    // Request was sent from client to delete a drone.
    // NOTE the drone is not deleted from the DB this way.
    // This only removes the drone from the associated session.
    socket.on('drone:delete', onDroneDelete);

    socket.on('error', onSocketError);

    socket.on('disconnect', function() {
      log.info('[IO] Disconnect at', addr);

      // Clean up.
      clearInterval(hb);
      socket.removeListener('drone:delete', onDroneDelete);
      socket.removeListener('error', onSocketError);
      dronelink.removeListener('update', onSessionUpdate);
      dronelink.removeListener('dbUpdate', onDatabaseUpdate);
      dronelink.removeListener('stream:mavlink', onMavlinkData);
      // sitlLink.removeListener('sitl:mavlink', onSITLData);
    });

    //
    // Drone Link Events
    //
    dronelink.on('update',          onSessionUpdate);
    dronelink.on('dbUpdate',        onDatabaseUpdate);
    dronelink.on('stream:mavlink',  onMavlinkData);

    //
    // SITL Events
    //
    // sitlLink.on('sitl:mavlink',     onSITLData);

    //
    // Event Handlers
    //
    function onSocketError(error) {
      log.warn('[IO]', error);
    }

    function onDroneDelete(data) {
      dronelink.removeDrone(session.onlineDrones, data);
    }

    function onSessionUpdate(data) {
      var userData = session.userData;

      if (session.onlineDrones) {
        session.onlineDrones[data.drone._id] = {status: data.state, session: data.session};
      }
    }

    function onDatabaseUpdate(data) {
      socket.emit('update');
    }

    function onMavlinkData(data) {
      if (session.onlineDrones[data.drone].session == data.session) {
        socket.emit('mavlink', data);
      }
    }

    function onSITLData(data) {
      socket.emit('sim:mavlink', data);
    }

  });
};
