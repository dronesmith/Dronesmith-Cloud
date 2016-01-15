'use strict';

var fs = require('fs');
var dgram = require('dgram');
var mavlinkhelper = require('../../lib/mavlinkhelper');
var dronedp = require('../../lib/dronedp');
var launcher = require('../../lib/codelauncher');
var Emitter = require('events').EventEmitter;

var MONITOR_PORT = 4002;
var MAVLINK_DEV = 14550;
var CODE_DEV = 14551;
// var MONITOR_HOST = 'stage.dronesmith.io',
var MONITOR_HOST = 'localhost';
// var FORGE_CONFIG = '/Forge/config.json',
// var FORGE_SYNC = '/Forge/data/',
var FORGE_CONFIG = 'config.json';
var RELOAD_TIME = 10;
var MONITOR_INTERVAL = 1;

var reloader = new Emitter();
var statusMon = null;

// Init the app
reloader.on('reload', run);
reloader.emit('reload');

// get config info
function loadConfig () {
  var stat = fs.statSync(FORGE_CONFIG);

  if (stat) {
    return fs.readFileSync(FORGE_CONFIG);
  } else {
    console.log('[ERROR]', 'config not found!');
    return null;
  }
}

// (flight) Garbage collector
// TODO
// setInterval(function() {
//   var config = loadConfig();
//
//   if (config && config.tempFlightCnt) {
//     fs.stat(FORGE_SYNC, function(err, stat) {
//       if (err) {
//         console.log('[ERROR]', err.code);
//       } else {
//         console.log('[GB]', stat);
//       }
//     });
//   }
// }, 60000);

// Entry point.
function run () {
  var client = dgram.createSocket('udp4');
  var mavConnect = dgram.createSocket('udp4');
  var sessionId = '';

  var noSessionCnt = 0;

  var codeStatus = {
    script: null
  };

  // Mavlink listener
  mavConnect.bind(MAVLINK_DEV, function () {
    mavConnect.on('message', function (msg) {
      mavlinkhelper.parseJSON(msg, function (err, result) {
        if (!err) {
          reloader.emit('system:mavlink', result);
        } else {
          console.log('[ERROR]', err);
        }
      });
    });
  });

  // session timer
  var sessionTimeout = setInterval(function () {
    if (noSessionCnt++ > 5) {
      sessionId = '';
      noSessionCnt = 0;
      console.log('[MON]', 'No valid reply from server.');
    }
  }, 5000);

  // status messages
  statusMon = setInterval(function () {
    var config = loadConfig();
    var buff;

    try {
      var cfgData = JSON.parse(config.toString());
    } catch (e) {
      console.log('[ERROR]', e);
    }

    var sendObj = {op: 'status'};

    if (cfgData) {
      if (!cfgData.drone || sessionId === '') {
        // if no drone meta data or a session Id, send a connection request
        sendObj.email = cfgData.email;
        sendObj.password = cfgData.password;
        sendObj.serialId = cfgData.serialId;
        sendObj.op = 'connect';
        sendObj.codeStatus = codeStatus;
      }

      buff = dronedp.generateMsg(dronedp.OP_STATUS, sessionId, sendObj);
      client.send(buff, 0, buff.length, MONITOR_PORT, MONITOR_HOST);
    }
  }, MONITOR_INTERVAL * 1000);

  // Echo mavlink data
  reloader.on('system:mavlink', function (result) {
    var buff = dronedp.generateMsg(dronedp.OP_MAVLINK_TEXT, sessionId, result);
    client.send(buff, 0, buff.length, MONITOR_PORT, MONITOR_HOST);
  });

  // Rx handling
  client.on('message', function (msg, rinfo) {
    try {
      var decoded = dronedp.parseMessage(msg);
      // Only resetting this if there was no error.
      // Might need to update this in the future, but
      // just to be safe for now.

      noSessionCnt = 0;
    } catch (e) {
      console.log('[MON]', e);
    }

    // update sessionId if different.
    if (decoded.session) {
      sessionId = decoded.session;
    }

    var data = decoded.data;

    // update drone information from server.
    if (data.drone) {
      var config = loadConfig();

      try {
        var cfgData = JSON.parse(config.toString());
      } catch (e) {
        console.log('[ERROR]', e);
      }

      cfgData.drone = data.drone;
      fs.writeFileSync(FORGE_CONFIG, JSON.stringify(cfgData));
    }

    if (data.codeBuffer && codeStatus.script == null) {
      console.log('[MON] Got CODE, running job.');

      launcher.runScript(null, codeStatus, data.codeBuffer, '../../code/exec.py');
    }
  });

  launcher.getEmitter().on('code:update', function (msg) {
    var buff = dronedp.generateMsg(dronedp.OP_STATUS, sessionId,
      {op: 'code', msg: msg, status: codeStatus});
    client.send(buff, 0, buff.length, MONITOR_PORT, MONITOR_HOST);
  });

  // Reinitialize app on error
  client.on('error', function (err) {
    client.close();

    console.log(err);

    setTimeout(function () {
      reloader.emit('reload');
    }, RELOAD_TIME * 1000);
  });
}
