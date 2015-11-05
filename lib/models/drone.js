'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId,
    validate = require('mongoose-validator');

exports.schema = new Schema({

  name: {
    type: String
  },

  systemId: {
    type: Number,
    required: true,
    default: 1
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

  firmwareId: {
    type: String,
    default: "unknown"
  },

  parameters: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  // sub docs
  missions: [ {
      type: ObjectId,
      ref: 'Mission'
    }
  ]
});

module.exports = mongoose.model('Drone', this.schema);
