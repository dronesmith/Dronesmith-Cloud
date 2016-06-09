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
    default: ""
  },

  kind: {
    type: String,
    required: true,
    enum: 'mavlink sdlog mavlinkBinary'.split(' ')
  },

  created: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },

  start: {
    type: Date
  },

  end: {
    type: Date
  },

  user: {
    type: ObjectId,
    ref: 'User'
  },

  errCount: {
    type: Number
  },

  flight: [
    {
      _id: false,
      time: {
        type: Date,
        // required: true,
        default: Date.now
      },

      message: {
        type: mongoose.Schema.Types.Mixed,
        required: true
      },

      payload: {
        _id: false,
        type: mongoose.Schema.Types.Mixed
      },

      systemId: {
        type: Number,
        required: true,
        default: 0
      },

      componentId: {
        type: Number,
        default: 0
      }
    }
  ],

  parameters: {
    type: mongoose.Schema.Types.Mixed
  }
});

module.exports = mongoose.model('Mission', this.schema);
