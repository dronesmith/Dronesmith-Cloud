'use strict'

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId,
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
  }
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

module.exports = mongoose.model('User', this.schema);
