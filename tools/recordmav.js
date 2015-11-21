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
  console.log("\t--pretty\tOutput JSON with proper white spacing.")
} else {
  var time = 30,
    filedest = path.join(path.resolve(__dirname), 'output.json'),
    dev = '',
    pretty = false;

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
      case '--pretty':
        pretty = true;
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

  var stream = {
    flight: [],
    parameters: {}
  };

  // var stream = fs.createWriteStream(filedest);

  // stream.on('error', function(err) {
  //   console.log(err + '\t\t\t\t:(');
  //   process.exit(-1);
  // });

  // stream.once('open', function(fd) {
    serialPort.on('open', function() {
      var mav = new mavlink(1,1);

      mav.on('ready', function() {
        console.log("Recording for", time, "seconds...");

        stream['start'] = new Date();

        setTimeout(function() {
          stream['end'] = new Date();
          if (pretty) fs.writeFileSync(filedest, JSON.stringify(stream, null, 4));
          else fs.writeFileSync(filedest, JSON.stringify(stream));
          console.log("Done.\t\t\t\t:)");
          process.exit(0);
        }, time * 1000);

        serialPort.on('data', function(data) {
          mav.parse(data);
        });

        mav.on('HEARTBEAT', function(msg, data) {
          stream.flight.push({
            time:         new Date(),
            systemId:     msg.system,
            componentId:  msg.component,
            message:      msg.id,
            payload:      data
          });
        });

        mav.on('STATUSTEXT', function(msg, data) {
          stream.flight.push({
            time:         new Date(),
            systemId:     msg.system,
            componentId:  msg.component,
            message:      msg.id,
            payload:      data
          });
        });

        mav.on('COMMAND_LONG', function(msg, data) {
          stream.flight.push({
            time:         new Date(),
            systemId:     msg.system,
            componentId:  msg.component,
            message:      msg.id,
            payload:      data
          });
        });

        mav.on('SYS_STATUS', function(msg, data) {
          stream.flight.push({
            time:         new Date(),
            systemId:     msg.system,
            componentId:  msg.component,
            message:      msg.id,
            payload:      data
          });
        });

        mav.on('HIGHRES_IMU', function(msg, data) {
          stream.flight.push({
            time:         new Date(),
            systemId:     msg.system,
            componentId:  msg.component,
            message:      msg.id,
            payload:      data
          });
        });

        mav.on('ATTITUDE', function(msg, data) {
          stream.flight.push({
            time:         new Date(),
            systemId:     msg.system,
            componentId:  msg.component,
            message:      msg.id,
            payload:      data
          });
        });

        mav.on('ATTITUDE_QUATERNION', function(msg, data) {
          stream.flight.push({
            time:         new Date(),
            systemId:     msg.system,
            componentId:  msg.component,
            message:      msg.id,
            payload:      data
          });
        });

        mav.on('VFR_HUD', function(msg, data) {
          stream.flight.push({
            time:         new Date(),
            systemId:     msg.system,
            componentId:  msg.component,
            message:      msg.id,
            payload:      data
          });
        });

        mav.on('GPS_RAW_INT', function(msg, data) {
          stream.flight.push({
            time:         new Date(),
            systemId:     msg.system,
            componentId:  msg.component,
            message:      msg.id,
            payload:      data
          });
        });

        mav.on('GLOBAL_POSITION_INT', function(msg, data) {
          stream.flight.push({
            time:         new Date(),
            systemId:     msg.system,
            componentId:  msg.component,
            message:      msg.id,
            payload:      data
          });
        });

        mav.on('LOCAL_POSITION_NED', function(msg, data) {
          stream.flight.push({
            time:         new Date(),
            systemId:     msg.system,
            componentId:  msg.component,
            message:      msg.id,
            payload:      data
          });
        });

        mav.on('VICON_POSITION_ESTIMATE', function(msg, data) {
          stream.flight.push({
            time:         new Date(),
            systemId:     msg.system,
            componentId:  msg.component,
            message:      msg.id,
            payload:      data
          });
        });

        mav.on('GPS_GLOBAL_ORIGIN', function(msg, data) {
          stream.flight.push({
            time:         new Date(),
            systemId:     msg.system,
            componentId:  msg.component,
            message:      msg.id,
            payload:      data
          });
        });

        mav.on('SERVO_OUTPUT_RAW_0', function(msg, data) {
          stream.flight.push({
            time:         new Date(),
            systemId:     msg.system,
            componentId:  msg.component,
            message:      msg.id,
            payload:      data
          });
        });

        mav.on('SERVO_OUTPUT_RAW_1', function(msg, data) {
          stream.flight.push({
            time:         new Date(),
            systemId:     msg.system,
            componentId:  msg.component,
            message:      msg.id,
            payload:      data
          });
        });

        mav.on('SERVO_OUTPUT_RAW_2', function(msg, data) {
          stream.flight.push({
            time:         new Date(),
            systemId:     msg.system,
            componentId:  msg.component,
            message:      msg.id,
            payload:      data
          });
        });

        mav.on('SERVO_OUTPUT_RAW_3', function(msg, data) {
          stream.flight.push({
            time:         new Date(),
            systemId:     msg.system,
            componentId:  msg.component,
            message:      msg.id,
            payload:      data
          });
        });

        mav.on('HIL_CONTROLS', function(msg, data) {
          stream.flight.push({
            time:         new Date(),
            systemId:     msg.system,
            componentId:  msg.component,
            message:      msg.id,
            payload:      data
          });
        });

        mav.on('POSITION_TARGET_GLOBAL_INT', function(msg, data) {
          stream.flight.push({
            time:         new Date(),
            systemId:     msg.system,
            componentId:  msg.component,
            message:      msg.id,
            payload:      data
          });
        });

        mav.on('POSITION_TARGET_LOCAL_NED', function(msg, data) {
          stream.flight.push({
            time:         new Date(),
            systemId:     msg.system,
            componentId:  msg.component,
            message:      msg.id,
            payload:      data
          });
        });

        mav.on('ATTITUDE_TARGET', function(msg, data) {
          stream.flight.push({
            time:         new Date(),
            systemId:     msg.system,
            componentId:  msg.component,
            message:      msg.id,
            payload:      data
          });
        });

        mav.on('RC_CHANNELS_RAW', function(msg, data) {
          stream.flight.push({
            time:         new Date(),
            systemId:     msg.system,
            componentId:  msg.component,
            message:      msg.id,
            payload:      data
          });
        });

        mav.on('MANUAL_CONTROL', function(msg, data) {
          stream.flight.push({
            time:         new Date(),
            systemId:     msg.system,
            componentId:  msg.component,
            message:      msg.id,
            payload:      data
          });
        });

        mav.on('OPTICAL_FLOW', function(msg, data) {
          stream.flight.push({
            time:         new Date(),
            systemId:     msg.system,
            componentId:  msg.component,
            message:      msg.id,
            payload:      data
          });
        });

        mav.on('ATTITUDE_CONTROLS', function(msg, data) {
          stream.flight.push({
            time:         new Date(),
            systemId:     msg.system,
            componentId:  msg.component,
            message:      msg.id,
            payload:      data
          });
        });

        mav.on('NAMED_VALUE_FLOAT', function(msg, data) {
          stream.flight.push({
            time:         new Date(),
            systemId:     msg.system,
            componentId:  msg.component,
            message:      msg.id,
            payload:      data
          });
        });

        mav.on('CAMERA_CAPTURE', function(msg, data) {
          stream.flight.push({
            time:         new Date(),
            systemId:     msg.system,
            componentId:  msg.component,
            message:      msg.id,
            payload:      data
          });
        });

        mav.on('DISTANCE_SENSOR', function(msg, data) {
          stream.flight.push({
            time:         new Date(),
            systemId:     msg.system,
            componentId:  msg.component,
            message:      msg.id,
            payload:      data
          });
        });



        // mav.on('message', function(msg) {
        //   // console.log(msg);
        //   stream.write(JSON.stringify({
        //     time:         new Date(),
        //     systemId:     msg.system,
        //     componentId:  msg.component,
        //     message:      msg.id,
        //     payload:      msg.payload,
        //     sequence:     msg.sequence
        //   }));
        // });
      });
    });

    serialPort.on('error', function(err) {
      console.log(err + '\t\t\t\t:(');
      process.exit(-1);
    });
  // });
}
