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
  config = require('../config/config.js')
  ;

module.exports.Request = function(request, path, cb) {
  // console.log(request.method, request.body, request.headers, path);
  var options = {
    host: config.apiservice.url,
    port: config.apiservice.port,
    path: path,
    method: request.method,
    headers: request.headers
  };

  var callback = function(response) {
    var str = '';

    response.on('data', function (chunk) {
      str += chunk;
    });

    response.on('end', function () {
      var parsed = {};

      if (response.statusCode == 200 || response.statusCode == 400) {
        try {
          parsed = JSON.parse(str);
        } catch (e) {
          return cb(null, e);
        }
        return cb({status: response.statusCode, chunk: parsed}, null);
      } else {
        return cb({status: response.statusCode, chunk: str}, null);
      }

    });
  }

  var buff;

  if (request.body) {
    buff = JSON.stringify(request.body);
    options.headers['Content-Length'] = buff.length;
  }

  var req = http.request(options, callback);

  req.on('error', function(err) {
    return cb(null, err);
  });

  if (request.body) {
    req.write(buff);
  }

  req.end();
}
