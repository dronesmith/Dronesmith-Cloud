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
  config = require('../config'),
  authy = require('authy')(config.authy.key)
  ;

module.exports.SMSAuth = function(email, phone, country, cb) {
  authy.register_user(email, phone, function (err, res) {
    if (err) {
      return cb(null, err);
    } else if (!res) {
      return cb(null, new Error("No response object"));
    } else {
      authy.phones().verification_start(phone, country,
        { via: 'sms', locale: 'us'},
        function(err, res) {
          return cb(res, err);
      });
    }
  });
}

module.exports.Verify = function(phone, country, code, cb) {
  authy.phones().verification_check(phone, country, code, function (err, res) {
    return cb(res, err);
  });
}

// module.exports.Remove = function(phone, country, cb) {
//   authy.phones().info(phone, country,  function (err, res) {
//     return cb(err, res);
//   });
// }
