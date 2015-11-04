'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId,
    validate = require('mongoose-validator');

exports.schema = new Schema({

  name: {
    type: String
  },

  kind: {
    type: String,
    required: true,
    enum: 'mavlink sdlog'.split(' ')
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

  errCount: {
    type: Number
  },

  flight: [
    {
      time: {
        type: Date,
        // required: true,
        default: Date.now
      },

      message: {
        type: Number,
        required: true
      },

      payload: {
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
