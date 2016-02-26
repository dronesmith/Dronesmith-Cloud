'use strict';

var
  cp = require('child_process'),
  os = require('os'),
  http = require('http'),
  path = require('path'),
  events = require('events');

var
  utils = require('./utils'),
  log = utils.log,
  settings = utils.settings,
  emitter = new events.EventEmitter();

var
  task = null;


exports.openTunnel = function() {
  var spawnStr = '';
  var authTask = null;

  switch (os.platform()) {
    case 'darwin': spawnStr = 'ngrok/ngrok_osx'; break;
    case 'linux': spawnStr = 'ngrok/ngrok_edison'; break;
  }

  authTask = cp.spawn(spawnStr,
    ['authtoken', settings.NGROK_AUTH]);

  authTask.on('close', function(code) {
    if (!isNaN(code) && code == 0) {
      log('info', 'NGROK auth successful.');

      task = cp.spawn(spawnStr, ['tcp', '22']);

      task.on('close', (code) => {
        log('info', `Tunnel closed with code ${code}`);
      });

      function attemptInfo() {
        getTunnelInfo('http://localhost:4040/api/tunnels', function(data) {
          if (data) {
            if (!data.tunnels) { return; }
            if (!data.tunnels[0]) {return; }
            clearInterval(timer);
            var info = data.tunnels[0].public_url.split('tcp://')[1].split(':');
            emitter.emit('connect', {url: info[0], port: info[1], uname: 'root', pass: 'doingitlive'});
          } else {
            // perhaps indicate error here
          }
        });
      }

      var timer = setInterval(attemptInfo, 1000);
    } else {
      log('error', 'NGROK auth failed: ' + code);
    }
  });
}

function getTunnelInfo(requestAddr, cb) {
  http.get(requestAddr, function(res) {
    if (res.statusCode == 200) {
      var str = '';
      res.on('data', function(data) {
        str += data;
      });

      res.on('end', function() {
        var json = null;
        try {
          json = JSON.parse(str);
        } catch(e) {
          log('error', 'tunnel got invalid JSON');
          cb(null);
        }

        cb(json);
      });

    } else {
      log('error', 'Tunnel failed. Couldn\'t get tunnel info');
      cb(null);
    }
  }).on('error', function(err) {
    log('warn', 'Connection refused. Usually means ngrok hasn\'t connected yet...');
  });
}

exports.killTunnel = function() {

  if (task) {
    task.kill('SIGINT');
  }
}

exports.getEmitter = function() {
  return emitter;
}
