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

  simId: {
    type: String
  },

  systemId: {
    type: Number,
    required: true,
    default: 1
  },

  manufacturer: {
    type: String,
    default: ""
  },

  created: {
    type: Date,
    required: true,
    default: Date.now
  },

  updated: {
    type: Date
  },

  hardwareId: {
    type: String,
    default: "unknown"
  },

  type: {
    type: String,
    default: "Drone"
  },

  firmwareId: {
    type: String,
    default: "unknown"
  },

  parameters: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },

  // sub docs
  missions: [ {
      type: ObjectId,
      ref: 'Mission'
    }
  ],

  snippets: [{
    type: ObjectId,
    ref: 'Code'
  }]
});

module.exports = mongoose.model('Drone', this.schema);
