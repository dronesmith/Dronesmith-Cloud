'use strict';

var
  config = require('../config/config'),
  net = require('net'),
  mavlink = require('mavlink'),
  events = require('events'),
  mongoose = require('mongoose'),
  User = mongoose.model('User'),
  Drone = mongoose.model('Drone'),
  SOCKET_IDLE_TIME = 60,
  MAV_HEADER = 1,
  MAV_COMPONENT = 1;

function processMessage() {

}

module.exports = function(app, url) {
  var io = require('socket.io').listen(app);
  var emitter = new events.EventEmitter();
  var mav = new mavlink(MAV_HEADER, MAV_COMPONENT);

  function processNewDrone(data) {
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
          if (!data.serialId) {
            return emitError('Firmware Id required');
          }

          var drone = new Drone({
            firmwareId: data.systemId
          });

          drone.save(function(err, drone) {
            if (err) {
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
  };

  function emitError(string) {
    emitter.emit('error', string);
  }

  if (!url) {
    url = config.defaultAddress;
  }

  mav.on('ready', function() {

    // start the server
    var mavListener = net.createServer(function(socket) {
      console.log('[RT] Drone connected on', socket.remoteAddress);

      // close socket after a certain amount of inactivity.
      socket.setTimeout(SOCKET_IDLE_TIME*1000);

      var status = {
        op: 'status',
        error: null,
        drone: null
      };

      // indicates model in DB needs to be updated.
      emitter.on('updated', function(val) {
        console.log(val);
      });

      // add error to status object
      emitter.on('error', function(val) {
        console.log(val);
        status.error = val;
      });

      socket.on('end', function() {
        console.log('[RT] Drone disconnected on', socket.remoteAddress);
      });

      socket.on('error', function(err) {
        console.log('[RT]', err);
      });

      socket.on('timeout', function() {
        console.log('[RT]', socket.remoteAddress, 'Drone timed out');
        socket.destroy();
      });

      // It is the responsibility of the drone to contact the server. This is
      // because there is little the server can do until it gets additional drone information.
      socket.on('data', function(buff) {
        var op = buff.readUInt8(0);

        // Determines if this is a MAVLink message or a status message.
        // We may define additional messages here.
        switch (op) {
          case 0xFE:
            // parse mavlink
            mav.parse(buff);
            break;
          default: // assume JSON FIXME
            var json = JSON.parse(buff.toString());
            switch(json.op) {
              case 'new':
                processNewDrone(json);
                break;

              case 'sync':
                socket.write(JSON.stringify(status));
                break;
            }
            break;
        }
      });

    }).listen({
      'host': url,
      'port': config.realtime.port
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
