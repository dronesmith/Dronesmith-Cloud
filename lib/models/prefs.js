'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId,
    validate = require('mongoose-validator');

exports.schema = new Schema({
  totalMembers: Number
});

module.exports = mongoose.model('Prefs', this.schema);
