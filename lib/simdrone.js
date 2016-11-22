/**
 * Dronesmith Cloud
 *
 * Principle Engineer: Geoff Gardner <geoff@dronesmith.io>
 *
 * Copyright (C) 2016 Dronesmith Technologies Inc, all rights reserved.
 * Unauthorized copying of any source code or assets within this project, via
 * any medium is strictly prohibited.
 *
 * Proprietary and confidential.
 */


'use strict';

var
  http = require('http'),
  config = require('../config/config')
  ;

module.exports.Update = function(id, stop, cb) {
  var options = {
    host: config.sitl.address,
    port: config.sitl.port,
    path: '/containers/'+id+'/'+(stop?'stop?t=5':'start'),
    method: 'POST'
  }

  var post_req = http.request(options, function(res) {
    res.setEncoding('utf8');
    res.on('error', function(err) {
      cb(err);
    });
    if (res.statusCode === 204) {
      return cb(null);
    } else if (res.statusCode === 304) {
      if (stop) {
        return cb("Drone already stopped.");
      } else {
        return cb("Drone is already running.");
      }
    } else if (res.statusCode === 404) {
      return cb("Could not find drone's virtual environment.");
    } else {
      if (stop) {
        return cb("Could not stop virtual drone.");
      } else {
        return cb("Could not start virtual drone.");
      }
    }
  });

  post_req.on('error', function(err) {
    cb(null, err);
  });

  // post the data
  post_req.end();
}

module.exports.Kill = function(id, cb) {
  var options = {
    host: config.sitl.address,
    port: config.sitl.port,
    path: '/containers/'+id+'?v=1&force=1',
    method: 'DELETE'
  }

  var post_req = http.request(options, function(res) {
    res.setEncoding('utf8');
    res.on('error', function(err) {
      cb(err);
    });
    if (res.statusCode === 204) {
      return cb(null);
    } else if (res.statusCode === 400) {
      return cb("Internal error.");
    } else if (res.statusCode === 409) {
      return cb("Virtual drone confliction.");
    } else if (res.statusCode === 404) {
      return cb("Could not find drone's virtual environment.");
    } else {
      return cb("Could not kill virtual drone.");
    }
  });

  post_req.on('error', function(err) {
    cb(null, err);
  });

  // post the data
  post_req.end();
}

module.exports.getAllContainers = function(cb) {
  http.get("http://"+config.sitl.address+":"+config.sitl.port + '/containers/json', function(res) {
    var result = '';
    res.setEncoding('utf8');
    res.on('error', function(err) {
      cb(null, err);
    });
    res.on('data', function (chunk) {
      result += chunk;
    });
    res.on('end', function() {
      var json = '';
      try {
        json = JSON.parse(result);
        cb(json, null);
      } catch(e) {
        cb(result, null);
      }
    });
  });
}

module.exports.getStatus = function(id, cb) {
  var attempts = 10;
  var req = http.get("http://"+config.sitl.address+":"+config.sitl.port + '/containers/' + id + '/stats', function(res) {
    var result = '';
    res.setEncoding('utf8');
    res.on('error', function(err) {
      cb(null, err);
    });
    res.on('data', function (chunk) {
      result += chunk;
      var errorHappened = false;

      attempts++

      var json = '';
      try {
        json = JSON.parse(result);
      } catch(e) {
        errorHappened = true;
      }

      if (!errorHappened && attempts > 0) {
        req.abort();
        cb(json, null);
      } else if (attempts <= 0) {
        cb(json, new Error("Could get a valid response"));
      }
    });
  });
}


function getContainerInfo(id, cb) {
  http.get("http://"+config.sitl.address+":"+config.sitl.port + '/containers/'+id+'/json', function(res) {
    var result = '';
    res.setEncoding('utf8');
    res.on('error', function(err) {
      cb(null, err);
    });
    res.on('data', function (chunk) {
      result += chunk;
    });
    res.on('end', function() {
      var json = '';
      try {
        json = JSON.parse(result);
        cb(json, null);
      } catch(e) {
        cb(result, null);
      }
    });
  });
}

module.exports.Make = function(name, lat, lon, cb) {
  if (!lat) {
    lat = config.sitl.lat;
  }

  if (!lon) {
    lon = config.sitl.lon;
  }

  var sendJson = {
       "AttachStdin": true,
       "AttachStdout": true,
       "AttachStderr": true,
       "Tty": true,
       "OpenStdin": true,
       "StdinOnce": true,
       "Cmd": [
         "/bin/bash",
         "-c",
         "/startsim.sh"
       ],
       "Image": "ricki1",
       "Env": [
         "SIM_START_LAT="+lat,
         "SIM_START_LON="+lon
       ],
       "HostConfig": {
         "Memory": 500 * 1e6
         // XXX "CpuQuota":
       }
  };

  var pdata = JSON.stringify(sendJson);
  var namestr = "";
  if (name) {
    namestr = "?name=" + name;
  }

  var options = {
    host: config.sitl.address,
    port: config.sitl.port,
    path: '/containers/create'+namestr,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': pdata.length
    }
  }

  var post_req = http.request(options, function(res) {
    var result = '';
    res.setEncoding('utf8');
    res.on('error', function(err) {
      cb(null, err);
    });
    res.on('data', function (chunk) {
      result += chunk;
    });
    res.on('end', function() {
      var json = '';
      try {
        json = JSON.parse(result);

        console.log('Getting container info:', json.Id);
        getContainerInfo(json.Id, function(container, error) {
          if (error) {
            cb(null, error);
          } else if (!container) {
            cb(null, new Error("container was not created."));
          } else {
            cb({"Id": json.Id, "Name": container.Name.split('/')[1]}, null)
          }
        });
      } catch(e) {
        cb(result, e);
      }
    });
  });

  post_req.on('error', function(err) {
    cb(null, err);
  });

  // post the data
  post_req.write(pdata);
  post_req.end();
}
