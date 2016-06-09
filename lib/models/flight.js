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
    Mixed = Schema.Mixed,
    validate = require('mongoose-validator');

exports.schema = new Schema({

  start: {
    type: Date,
    required: true
  },

  end: {
    type: Date,
    required: true
  },

  flight: [
    {
      event: {
        type: String,
        required: true
      },
      at: {
        type: Date,
        required: true
      },
      data: {
        type: mongoose.Schema.Types.Mixed
      }
    }
  ]



});

module.exports = mongoose.model('Flight', this.schema);
