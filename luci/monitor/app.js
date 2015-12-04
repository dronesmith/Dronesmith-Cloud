'use strict';


var
  fs = require('fs'),
  emitter = require('events').EventEmitter,
  dgram = require('dgram'),
  dronedp = require('../../lib/dronedp');

var
  MONITOR_PORT = 4001,
  MONITOR_HOST = 'localhost',
  // FORGE_CONFIG = '/Forge/config.json',
  // FORGE_SYNC = '/Forge/data/',
  FORGE_CONFIG = 'config.json',
  FORGE_SYNC = '/Forge/data/',
  RELOAD_TIME = 10,
  MONITOR_INTERVAL = 5;

var
  reloader = new emitter(),
  statusMon = null;

reloader.on('reload', run);
reloader.emit('reload');

// get config info
function loadConfig() {
  var stat = fs.statSync(FORGE_CONFIG);

  if(stat) {
    // read file
    return fs.readFileSync(FORGE_CONFIG);
  } else {
    console.log('[ERROR]', 'config not found!');
    return null;
  }
}

// (flight) Garbage collector
setInterval(function() {
  var config = loadConfig();

  if (config && config.tempFlightCnt) {
    fs.stat(FORGE_SYNC, function(err, stat) {
      if (err) {
        console.log('[ERROR]', err.code);
      } else {
        console.log('[GB]', stat);
      }
    });
  }
}, 60000);



function run() {
  var client = dgram.createSocket('udp4');

  // status messages
  statusMon = setInterval(function() {
    var config = loadConfig(), buff;

    try {
      var cfgData = JSON.parse(config.toString());
    } catch (e) {
      console.log('[ERROR]', e);
    }

    if (cfgData && !cfgData.drone) {
      buff = dronedp.generateMsg(0x10, {
        op: 'new',
        email: cfgData.email,
        password: cfgData.password,
        serialId: cfgData.serialId
      });
      client.send(buff, 0, buff.length, MONITOR_PORT, MONITOR_HOST);
    }

    buff = dronedp.generateMsg(0x10, { op: 'status' });
    client.send(buff, 0, buff.length, MONITOR_PORT, MONITOR_HOST);
  }, MONITOR_INTERVAL * 1000);

  client.on('message', function(msg, rinfo) {
    var decoded = dronedp.parseMessage(msg);
    if (decoded.error) {
      console.log('[MON]', decoded.error);
    }

    if (decoded.drone) {
      var config = loadConfig();

      try {
        var cfgData = JSON.parse(config.toString());
      } catch (e) {
        console.log('[ERROR]', e);
      }

      cfgData.drone = decoded.drone;
      fs.writeFileSync(FORGE_CONFIG, JSON.stringify(cfgData));
    }
  });

  // Reinitialize app on error
  client.on('error', function(err) {
      client.close();
      setTimeout(function() {
      reloader.emit('reload');
    }, RELOAD_TIME * 1000);
  });
};
