'use strict';


var
  fs = require('fs'),
  emitter = require('events').EventEmitter,
  net = require('net');

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

function generateMsg(type, data) {
  switch (type) {
    case 0xFD: // MAVLink
      // parsed MAVLink message
  }
  var sendBuff = new Buffer(5);

}

function run() {
  var client = net.connect({port: MONITOR_PORT, host: MONITOR_HOST}, function() {
    console.log('[MON]', 'Connected.');
    var config = loadConfig();

    try {
      var cfgData = JSON.parse(config.toString());
    } catch (e) {
      console.log('[ERROR]', e);
    }

    // status messages
      statusMon = setInterval(function() {
        if (cfgData && !cfgData.drone) {
          client.write(JSON.stringify({
            op: 'new',
            email: cfgData.email,
            password: cfgData.password,
            serialId: cfgData.serialId
          }));
        }

        client.write(JSON.stringify({op: 'sync'}));
      }, MONITOR_INTERVAL * 1000);

    client.on('data', function(msg) {
      console.log('[MON]', msg);
    });
  });

  client.on('error', function(err) {
    client.destroy();
    setTimeout(function() {
          reloader.emit('reload');
    }, RELOAD_TIME * 1000)
  });

  client.on('end', function() {
    console.log('[MON]', 'Disconnected.');
    clearInterval(statusMon);
    client.destroy();
    reloader.emit('reload');
  });
};
