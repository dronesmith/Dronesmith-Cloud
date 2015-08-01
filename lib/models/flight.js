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
