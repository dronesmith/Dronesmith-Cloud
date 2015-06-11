'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId,
    validate = require('mongoose-validator');

exports.schema = new Schema({

  name: {
    type: String,
    required: true,
    unique: true,
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
