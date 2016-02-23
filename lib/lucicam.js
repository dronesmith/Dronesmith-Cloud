// modules
var
  http = require('http'),
  ws = require('ws');

// configuration globals
var configServer = {
  streamPortNormal: 8082,
  streamPortThermal: 8083,
  wsPortNormal: 8084,
  wsPortThermal: 8085
};

/// Video streaming section
// Reference: https://github.com/phoboslab/jsmpeg/blob/master/stream-server.js

var STREAM_MAGIC_BYTES = 'jsmp'; // Must be 4 bytes
var width = 320;
var height = 240;

// WebSocket servers
var wsServerNormal = new (ws.Server)({ port: configServer.wsPortNormal });
var wsServerThermal = new (ws.Server)({ port: configServer.wsPortThermal });
console.log('[LUCICAM] WebSocket server listening on port ' + configServer.wsPortNormal + ' and ' + configServer.wsPortThermal);

// Normal websocket
wsServerNormal.on('connection', function(socket) {
  // Send magic bytes and video size to the newly connected socket
  // struct { char magic[4]; unsigned short width, height;}
  var streamHeader = new Buffer(8);

  streamHeader.write(STREAM_MAGIC_BYTES);
  streamHeader.writeUInt16BE(width, 4);
  streamHeader.writeUInt16BE(height, 6);
  socket.send(streamHeader, { binary: true });

  console.log('[LUCICAM] New WebSocket Connection (' + wsServerNormal.clients.length + ' total)');

  socket.on('close', function(code, message){
    console.log('[LUCICAM] Disconnected WebSocket (' + wsServerNormal.clients.length + ' total)');
  });
});

wsServerNormal.broadcast = function(data, opts) {
  for(var i in this.clients) {
    if(this.clients[i].readyState == 1) {
      this.clients[i].send(data, opts);
    }
    else {
      console.log('[LUCICAM] Error: Client (' + i + ') not connected.');
    }
  }
};

// Thermal websocket
wsServerThermal.on('connection', function(socket) {
  // Send magic bytes and video size to the newly connected socket
  // struct { char magic[4]; unsigned short width, height;}
  var streamHeader = new Buffer(8);

  streamHeader.write(STREAM_MAGIC_BYTES);
  streamHeader.writeUInt16BE(width, 4);
  streamHeader.writeUInt16BE(height, 6);
  socket.send(streamHeader, { binary: true });

  console.log('[LUCICAM] New WebSocket Connection (' + wsServerThermal.clients.length + ' total)');

  socket.on('close', function(code, message){
    console.log('[LUCICAM] Disconnected WebSocket (' + wsServerThermal.clients.length + ' total)');
  });
});

wsServerThermal.broadcast = function(data, opts) {
  for(var i in this.clients) {
    if(this.clients[i].readyState == 1) {
      this.clients[i].send(data, opts);
    }
    else {
      console.log('[LUCICAM] Error: Client (' + i + ') not connected.');
    }
  }
};

// HTTP server to accept incoming MPEG1 stream
http.createServer(function (req, res) {
  console.log(
    '[LUCICAM]' +
    'Stream Connected: ' + req.socket.remoteAddress +
    ':' + req.socket.remotePort + ' size: ' + width + 'x' + height
  );

  req.on('data', function (data) {
    wsServerNormal.broadcast(data, { binary: true });
  });
}).listen(configServer.streamPortNormal, function () {
  console.log('[LUCICAM] Listening for video stream on port ' + configServer.streamPortNormal);
});

http.createServer(function (req, res) {
  console.log(
    '[LUCICAM]' +
    'Stream Connected: ' + req.socket.remoteAddress +
    ':' + req.socket.remotePort + ' size: ' + width + 'x' + height
  );

  req.on('data', function (data) {
    wsServerThermal.broadcast(data, { binary: true });
  });
}).listen(configServer.streamPortThermal, function () {
  console.log('[LUCICAM] Listening for video stream on port ' + configServer.streamPortThermal);
});
