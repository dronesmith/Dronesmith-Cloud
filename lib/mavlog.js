'use strict';

var
  fs = require('fs'),
  mavlink = require('mavlink')
;

exports.parse = function(cb) {
  fs.readFile('/Users/Geoff/software-dev/Skyworks/ForgeCore/tools/noMotorLogTest.mavlink', function(err, data) {

    var ptr = 0;

    while (ptr < data.length) {
      var date = new Date(data.readUIntBE(ptr, 8));
      ptr += 8;
      var len = data[ptr+1] + ptr + 8;
      var msgBuff = JSON.parse(JSON.stringify(data.slice(ptr, len)));
      // console.log(msgBuff);
      ptr = len;

      cb(date, msgBuff.data);
    }

    stream['end'] = stream.flight[stream.flight.length-1].time;
    fs.writeFileSync('/Users/Geoff/software-dev/Skyworks/ForgeCore/tools/noMotorLogTest.json', JSON.stringify(stream, null, 4));
    console.log('done');
  });
};

var mav = new mavlink(1,1);
var stream = {flight:[], parameters: {}};
var firstMsg = true;

function updateFlight(msg, date, data) {
  if (firstMsg) { stream['start'] = new Date((new Date()).getTime() + data.time_boot_ms); firstMsg = false; }
  stream.flight.push({
    time:         new Date((new Date()).getTime() + data.time_boot_ms) || new Date(),
    systemId:     msg.system,
    componentId:  msg.component,
    message:      msg.id,
    payload:      data
  });
}

mav.on('ready', function() {
  var currDate = null;
  exports.parse(function(date, data) {
    currDate = date;
    mav.parse(data);
  });

  // mav.on('message', function(msg) {
  //   console.log(msg);
  // });

  mav.on('HEARTBEAT',                   function(msg, data) { updateFlight(msg, currDate, data); });
  mav.on('STATUSTEXT',                  function(msg, data) { updateFlight(msg, currDate, data); });
  mav.on('COMMAND_LONG',                function(msg, data) { updateFlight(msg, currDate, data); });
  mav.on('SYS_STATUS',                  function(msg, data) { updateFlight(msg, currDate, data); });
  mav.on('HIGHRES_IMU',                 function(msg, data) { updateFlight(msg, currDate, data); });
  mav.on('ATTITUDE',                    function(msg, data) { updateFlight(msg, currDate, data); });
  mav.on('ATTITUDE_QUATERNION',         function(msg, data) { updateFlight(msg, currDate, data); });
  mav.on('VFR_HUD',                     function(msg, data) { updateFlight(msg, currDate, data); });
  mav.on('GPS_RAW_INT',                 function(msg, data) { updateFlight(msg, currDate, data); });
  mav.on('GLOBAL_POSITION_INT',         function(msg, data) { updateFlight(msg, currDate, data); });
  mav.on('LOCAL_POSITION_NED',          function(msg, data) { updateFlight(msg, currDate, data); });
  mav.on('VICON_POSITION_ESTIMATE',     function(msg, data) { updateFlight(msg, currDate, data); });
  mav.on('GPS_GLOBAL_ORIGIN',           function(msg, data) { updateFlight(msg, currDate, data); });
  mav.on('SERVO_OUTPUT_RAW_0',          function(msg, data) { updateFlight(msg, currDate, data); });
  mav.on('SERVO_OUTPUT_RAW_1',          function(msg, data) { updateFlight(msg, currDate, data); });
  mav.on('SERVO_OUTPUT_RAW_2',          function(msg, data) { updateFlight(msg, currDate, data); });
  mav.on('SERVO_OUTPUT_RAW_3',          function(msg, data) { updateFlight(msg, currDate, data); });
  mav.on('HIL_CONTROLS',                function(msg, data) { updateFlight(msg, currDate, data); });
  mav.on('POSITION_TARGET_GLOBAL_INT',  function(msg, data) { updateFlight(msg, currDate, data); });
  mav.on('POSITION_TARGET_LOCAL_NED',   function(msg, data) { updateFlight(msg, currDate, data); });
  mav.on('ATTITUDE_TARGET',             function(msg, data) { updateFlight(msg, currDate, data); });
  mav.on('RC_CHANNELS_RAW',             function(msg, data) { updateFlight(msg, currDate, data); });
  mav.on('MANUAL_CONTROL',              function(msg, data) { updateFlight(msg, currDate, data); });
  mav.on('OPTICAL_FLOW',                function(msg, data) { updateFlight(msg, currDate, data); });
  mav.on('ATTITUDE_CONTROLS',           function(msg, data) { updateFlight(msg, currDate, data); });
  mav.on('NAMED_VALUE_FLOAT',           function(msg, data) { updateFlight(msg, currDate, data); });
  mav.on('CAMERA_CAPTURE',              function(msg, data) { updateFlight(msg, currDate, data); });
  mav.on('DISTANCE_SENSOR',             function(msg, data) { updateFlight(msg, currDate, data); });

});
