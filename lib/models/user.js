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

var fs = require('fs'),
    path = require('path'),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId,
    Mod = mongoose.model('Mod'),
    _ = require('underscore'),
    validate = require('mongoose-validator'),
    crypto = require('crypto'),


    ITERATIONS = 10000,
    KEY_LEN = 128,

    nameValidator = [
        validate({
            validator: 'isLength',
            arguments: [2, 30],
            message: 'Field should be between 6 and 30 characters.'
        }),
        validate({
            validator: 'isAlphanumeric',
            passIfEmpty: false,
            message: 'Field should contain alpha-numeric characters only.'
        })
    ],


    emailValidator = [
        validate({
            validator: 'isEmail',
            passIfEmpty: false,
            message: 'Not a valid email.'
        })
    ];

exports.schema = new Schema({

  // Tracking info
  ipAddr: String,

  referringUrl: String,

  lastLogin: {
    type: Date
  },

  userAgent: String,

  apiKey: String,

  apiCnt: {
    type: Number,
    required: true,
    default: 0
  },

  language: {
    type: String,
    required: true,
    default: 'node',
    enum: 'node go csharp java php python ruby javascript android objectivec swift'.split(' ')
  },

  created: {
    type: Date,
    required: true,
    default: Date.now
  },

  // Phone Auth
  isVerified: {
    type: Boolean,
    required: true,
    default: false
  },

  // Email Auth
  isVerifiedEmail: {
    type: Boolean,
    required: true,
    default: false
  },

  phone: {
    type: String
  },

  onWaitList: {
    type: Boolean,
    required: true,
    default: true
  },

  // Don't think this is needed, since we can get this information from DB queries.
  // memberNo: Number,

  email: {
    type: String,
    required: true,
    validate: emailValidator,
  },

  fullName: {
    type: String,
    default: ""
  },

  company: {
    type: String,
    default: ""
  },

  cryptPass: {
    type: String,
    required: true,
    select: false
  },

  cryptSalt: {
    type: String,
    required: true,
    select: false
  },

  drones: [
    {
      type: ObjectId,
      ref: 'Drone'
    }
  ],
});

// FIXME
this.schema.pre('save', function(next) {
  var user = this.db.model('User');

  next();

});

this.schema.methods.validPassword = function (password) {
  if (!password) {
    return false;
  }
  return this.cryptPass === crypto.pbkdf2Sync(password, this.cryptSalt, ITERATIONS, KEY_LEN, 'sha512').toString('base64');
};

this.schema.methods.setPassword = function (password) {
  var salt = crypto.randomBytes(64).toString('base64');

  this.cryptPass = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, 'sha512').toString('base64');
  this.cryptSalt = salt;
};

this.schema.methods.setDefaultMods = function() {
  var scope = this.mods = [];

  _.each(DEFAULT_MODS, function(k) {
    try {
      var file = JSON.parse(
        fs.readFileSync(
          path.join(
            path.resolve(__dirname, appRoot),
            'public',
            'mods',
            k,
            'mod.json')));

        var modPath = path.join('mods', k);

        scope.push({
          name:       file.name,
          icon:       path.join(modPath, file.icon),
          index:      path.join(modPath, file.index),
          controller: file.controller,
        });
    } catch(e) {
      throw new Error(e);
    }
  });

  this.mods = scope;

};

module.exports = mongoose.model('User', this.schema);
