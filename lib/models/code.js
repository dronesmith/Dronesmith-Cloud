'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId,
    validate = require('mongoose-validator');

exports.schema = new Schema({

  name: {
    type: String,
    required: true
  },

  created: {
    type: Date,
    required: true,
    default: Date.now
  },

  updated: {
    type: Date
  },

  type: {
    type: String,
    required: true,
    enum: 'python'.split(' ')
  },

  content: {
    type: String
  }
});

module.exports = mongoose.model('Code', this.schema);
