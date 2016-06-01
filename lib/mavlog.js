'use strict';

var
  events = require('events'),
  mavlink = require('../lucikit/jsmavlink')
;

function parse(data, stream, emitter, cb) {

    var ptr = 0;

    while (ptr < data.length) {
      try {
        if (ptr + 8 > data.length) {
          break;
        }
        var date = new Date(data.readUIntBE(ptr, 8));
        ptr += 8;
        var len = data[ptr+1] + ptr + 8;
        var msgBuff = JSON.parse(JSON.stringify(data.slice(ptr, len)));
        ptr = len;
      } catch(e) {
        return emitter.emit('mavlog:error', stream);
      }

      cb(date, msgBuff.data);
    }

    if (stream.flight[stream.flight.length-1]) {
      stream['end'] = stream.flight[stream.flight.length-1].time;
    }

    return emitter.emit('mavlog:processedData', stream);
};

function updateFlight(msg, stream, data, status) {
  var tempSystemDate = new Date((new Date()).getTime() + data.time_boot_ms);

  // With love, Javascript.
  if (tempSystemDate == 'Invalid Date') {
    tempSystemDate = null;
  }

  if (status.firstMsg) {
    stream['start'] = tempSystemDate || status.systemDate;
    status.firstMsg = false;
  }

  stream.flight.push({
    time:         tempSystemDate || status.systemDate,
    systemId:     msg.system,
    componentId:  msg.component,
    message:      msg.id,
    payload:      data
  });

  if (tempSystemDate) {
    status.systemDate = tempSystemDate;
  }
}

exports.binaryToJson = function(buff, cb) {
  var
    mav = new mavlink(1,1),
    emitter = new events.EventEmitter(),
    stream = {flight:[], parameters: {}},
    status = {
      systemDate: new Date(),
      firstMsg: true
    }
  ;

  //
  // After successful parse
  //
  emitter.on('mavlog:processedData', function(data) {
    return cb(data);
  });

  emitter.on('mavlog:error', function(data) {
    return cb(null);
  });


  //
  // Mavlink event handler
  //
  mav.on('ready', function() {

    // mav.on('message', function(msg) {
    //   console.log(msg);
    // });

    // Message event table
    // Keeping this as it is due to memory leak errors.
    mav.on('HEARTBEAT',                   function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('STATUSTEXT',                  function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('COMMAND_LONG',                function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('SYS_STATUS',                  function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('EXTENDED_SYS_STATE',          function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('HIGHRES_IMU',                 function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('ATTITUDE',                    function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('ATTITUDE_QUATERNION',         function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('VFR_HUD',                     function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('GPS_RAW_INT',                 function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('GLOBAL_POSITION_INT',         function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('LOCAL_POSITION_NED',          function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('VICON_POSITION_ESTIMATE',     function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('GPS_GLOBAL_ORIGIN',           function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('SERVO_OUTPUT_RAW',            function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('SERVO_OUTPUT_RAW_0',          function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('SERVO_OUTPUT_RAW_1',          function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('SERVO_OUTPUT_RAW_2',          function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('SERVO_OUTPUT_RAW_3',          function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('ACTUATOR_CONTROL_TARGET',     function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('HIL_CONTROLS',                function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('POSITION_TARGET_GLOBAL_INT',  function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('POSITION_TARGET_LOCAL_NED',   function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('ATTITUDE_TARGET',             function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('RADIO_STATUS',                function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('RC_CHANNELS',                 function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('RC_CHANNELS_RAW',             function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('MANUAL_CONTROL',              function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('OPTICAL_FLOW',                function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('ATTITUDE_CONTROLS',           function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('NAMED_VALUE_FLOAT',           function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('CAMERA_CAPTURE',              function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('DISTANCE_SENSOR',             function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('BATTERY_STATUS',              function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('MISSION_CURRENT',             function(msg, data) { updateFlight(msg, stream, data, status); });
    mav.on('ALTITUDE',                    function(msg, data) { updateFlight(msg, stream, data, status); });

    parse(buff, stream, emitter, function(date, data) {
      // NOTE - date is unreliable, as it uses GPS, which may or may not be
      // available. Using the time from boot instead.
      mav.parse(data);
    });

  });

};
