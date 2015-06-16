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

    DEFAULT_MODS =
      ['Blocks', 'Terminal', 'My Forge', 'Flight Planner', 'Hangar', 'Tag Cam'],

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
  username: {
    type: String,
    required: true,
    unique: true,
    validate: nameValidator
  },

  ipAddr: String,

  email: {
    type: String,
    required: true,
    validate: emailValidator,
    index: true
  },

  cryptPass: {
    type: String,
    select: false
  },

  cryptSalt: {
    type: String,
    select: false
  },

  // TODO admin integration
  roles: [String],

  // Sub docs
  eedus: {
      type: [require('./eedu').schema]
  },

  mods: {
      type: [require('./mods').schema],
      required: true
  }

  // TODO
  // prefs: {
  //   type: ObjectId,
  //   ref: 'Prefs',
  //   index: true,
  //   select: false
  // }
});

// middleware to avoid duplicate username/email error
this.schema.pre('save', function(next) {
  var user = this.db.model('User');

  user
    .findOne({$or: [{username: this.username}]})
    .exec(function(err, user) {
      if (err || user) {
        return next(err || new Error("Username already taken."));
      }

      next();
    });
});

this.schema.methods.validPassword = function (password) {
  return this.cryptPass === crypto.pbkdf2Sync(password, this.cryptSalt, ITERATIONS, KEY_LEN).toString('base64');
};

this.schema.methods.setPassword = function (password) {
  var salt = crypto.randomBytes(64).toString('base64');

  this.cryptPass = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN).toString('base64');
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
