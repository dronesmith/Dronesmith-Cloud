'use strict';

var passport = require('passport'),
	User = require('./models/user'),
	path = require('path'),
	config = require('../config/config');

module.exports = function() {

	// Serialize sessions
	passport.serializeUser(function(user, done) {
		done(null, user.id);
	});

	// Deserialize sessions
	passport.deserializeUser(function(id, done) {
		User.findOne({
			_id: id
		}, '-salt -password', function(err, user) {
			done(err, user);
		});
	});

	// Initialize strategies
  var LocalStrategy = require('passport-local').Strategy;

  passport.use(new LocalStrategy({
		usernameField: 'email',
		passwordField: 'password'
	},
    function(username, password, done) {

      User
        .findOne({$or: [{username: username}, {email: username}]})
        .select('+cryptPass +cryptSalt')
        .exec(function (err, user) {
          try {
            if (err) {
              throw new Error(err);
            }

            if (!user || (user.cryptPass && user.cryptSalt && !user.validPassword(password))) {
              throw new Error({'error': 'Invalid username or password.'});
            }

            // get these out of memory
            delete user.cryptPass;
            delete user.cryptSalt;
            done(null, user);

            user.lastLogin = new Date();
            user.save();
          } catch(e) {
            done(e);
          }
        }
      );
    }
  ));

  // XXX add additional strategies (MFA?) below

	// expose for middleware
	return passport;
};
