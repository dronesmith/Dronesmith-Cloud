'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId,
    validate = require('mongoose-validator');

exports.schema = new Schema({

  name: {
    type: String
  },

  start: {
    type: Date,
    required: true,
    default: Date.now
  },

  end: {
    type: Date
  },

  user: {
    type: ObjectId,
    ref: 'User'
  },
  
  systemId: {
    type: Number,
    required: true
  },

  componentId: {
    type: Number,
    default: 0
  },

  flight: [
    {
      time: {
        type: Date,
        required: true,
        default: Date.now
      },

      message: {
        type: Number,
        required: true
      },

      payload: {
        type: mongoose.Schema.Types.Mixed
      }
    }
  ],

  parameters: {
    type: mongoose.Schema.Types.Mixed
  }
});

module.exports = mongoose.model('Mission', this.schema);
