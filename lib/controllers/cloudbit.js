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

var mongoose = require('mongoose'),
    User = mongoose.model('User'),
    log = require('../log.js').getLogger(__filename),
    Q = require('q'),
    _ = require('underscore'),

    // Cloudbit hurp a durp
    CLOUDBIT_TOKEN = '6121da6ae78ebd5cb7a3386f7f81b54d84f7062fc91c6ea0d66a08648cbebc54',
    CLOUDBIT_DEVICE = '00e04c03a655',
    cloudbit = require('littlebits-cloud-http')
      .defaults({ access_token: CLOUDBIT_TOKEN, device_id: CLOUDBIT_DEVICE })
    ;


/**

curl -i -XPOST \
-H "Authorization: Bearer 6121da6ae78ebd5cb7a3386f7f81b54d84f7062fc91c6ea0d66a08648cbebc54" \
https://api-http.littlebitscloud.cc/v3/devices/00e04c03a655/output


curl -i -XGET -H "Authorization: Bearer 6121da6ae78ebd5cb7a3386f7f81b54d84f7062fc91c6ea0d66a08648cbebc54" -H "Accept: application/vnd.littlebits.v2+json" https://api-http.littlebitscloud.cc/v3/devices/00e04c03a655/input


curl -i -XGET -H "Authorization: Bearer 6121da6ae78ebd5cb7a3386f7f81b54d84f7062fc91c6ea0d66a08648cbebc54" -H "Accept: application/vnd.littlebits.v2+json" https://api-http.littlebitscloud.cc/devices/00e04c03a655


// v3
curl -i -XGET -H "Authorization: Bearer 6121da6ae78ebd5cb7a3386f7f81b54d84f7062fc91c6ea0d66a08648cbebc54" https://api-http.littlebitscloud.cc/v3/devices/00e04c03a655/input

curl -i -XPOST -H "Authorization: Bearer 6121da6ae78ebd5cb7a3386f7f81b54d84f7062fc91c6ea0d66a08648cbebc54" https://api-http.littlebitscloud.cc/v3/devices/CLOUDBIT_ID/output -d percent=50 -d duration_ms=5000

*/

// exports.create = function(req, res, next) {
//   // TODO POST
// };


exports.get = function(req, res, next) {
  cloudbit
    .device(function(err, result) {
      if (err) {
        res
          .status(400)
          .json(err);
      } else {
        res.json(result || {error: "No data received."});
      }
    });
};

exports.output = function(req, res, next) {
  cloudbit
    .output({
      percent: req.query.percent || 50,
      duration_ms: req.query.duration_ms || 5000
    }, function(err, result) {
      if (err) {
        res
          .status(400)
          .json(err);
      } else {
        res.json(result || {error: "No data received."});
      }
    });
};

// exports.update = function(req, res) {
//   // TODO PUT
// };
//
// exports.destroy = function(req, res) {
//   // TODO DELETE
// };
