// Simple tool for getting mavlink log files.

'use strict';

var path = require('path'),
  mavlink = require('mavlink'),
  serialport = require('serialport'),
  fs = require('fs');

if (process.argv.length < 3) {
  console.log("recordmav - Records and generates a MAVLog file.");
  console.log("\t--dev\tSpecify radio device file. Required.");
  console.log("\t--dest\tFile destination. (default is root directory of Forge Core.)");
  console.log("\t-t\tSpecify length of time in seconds for recording. Required.");
} else {
  var time = 30,
    filedest = path.join(path.resolve(__dirname), 'output.json'),
    dev = '';

  for (var k in process.argv) {
    var arg = process.argv[k];

    switch (arg) {
      case '--dev':
        dev = process.argv[+k+1] || '';
        break;
      case '-t':
        time = +process.argv[+k+1] || 20;
        break;
      case '--dest':
        filedest = path.resolve(process.argv[+k+1]) || path.resolve(__dirname);
        break;
    }
  }

  console.log("Establishing connection with MAV Network...");

  var SerialPort = require("serialport").SerialPort;

  try {
    var serialPort = new SerialPort(dev, {
      baudrate: 57600
    });
  } catch (err) {
    console.log(err + '\t\t\t\t:(');
    process.exit(-1);
  }

  var stream = fs.createWriteStream(filedest);

  stream.on('error', function(err) {
    console.log(err + '\t\t\t\t:(');
    process.exit(-1);
  });

  stream.once('open', function(fd) {
    serialPort.on('open', function() {
      var mav = new mavlink(1,1);

      mav.on('ready', function() {
        console.log("Recording for", time, "seconds...");
        stream.write(JSON.stringify({start: new Date()}));

        setTimeout(function() {
          stream.write(JSON.stringify({end: new Date()}));
          stream.end();
          console.log("Done.\t\t\t\t:)");
          process.exit(0);
        }, time * 1000);

        serialPort.on('data', function(data) {
          mav.parse(data);
        });

        mav.on('message', function(msg) {
          // console.log(msg);
          stream.write(JSON.stringify({
            time:         new Date(),
            systemId:     msg.system,
            componentId:  msg.componentId,
            message:      msg.id,
            payload:      msg.payload,
            sequence:     msg.sequence
          }));
        });
      });
    });

    serialPort.on('error', function(err) {
      console.log(err + '\t\t\t\t:(');
      process.exit(-1);
    });
  });
}
