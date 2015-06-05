var conn = require('../db');
var logger = require('../log');
var userCollection = 'users';
var Q = require('q'),
    crypto = require('crypto'),
    ITERATIONS = 10000,
    KEY_LEN = 128;

var User = {

  create: function() {

  },

  validate: function(password, query) {
    var deferred = Q.defer();
    conn
      .collection('users')
      .findOne(query)
      .then(function(err, user) {
        if (err) {
          deferred.reject(err);
        } else {
          user.password === crypto.pbkdf2Sync(
            password,
            user.salt,
            ITERATIONS,
            KEY_LEN).toString('base64') ?
              deferred.resolve() : deferred.reject('Invalid Password');
        }
      });

    return deferred.promise;
  }
}

module.exports = User;
