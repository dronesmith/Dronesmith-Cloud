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
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId,
    validate = require('mongoose-validator');

exports.schema = new Schema({

  name: {
    type: String,
    required: true,
  },

  hardwareId: {
    type: String,
    required: true
  },

  firmwareId: {
    type: String,
    required: true
  },

  calibration: {

  },

  // sub docs
  flights: {
      type: [require('./flight').schema],
      select: false
  },

  missions: {
    type: [require('./mission').schema],
    select: false
  }
});

module.exports = mongoose.model('Eedu', this.schema);
