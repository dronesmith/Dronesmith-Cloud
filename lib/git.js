'use strict';

var
  config = require('../config/config'),
  log = require('./log.js').getLogger(__filename),
  http = require('https');

exports.getDefaultRepo = function(cb) {
  http.request({
    host: config.git.defaultHost,
    path: config.git.defaultPath
  }, function(res) {
    var str = '';

    res.on('data', function (chunk) {
      str += chunk;
    });

    res.on('end', function () {
      try {
        var data = JSON.parse(str)
      } catch (e) {
        log.error(e);
        cb(null);
      }

      cb(data || null);
    });
  })
  .end();
}
