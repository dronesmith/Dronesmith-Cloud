'use strict';

var passport = require('passport'),
	User = require('./dao/User'),
	path = require('path'),
  Q = require('q'),
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

  passport.use(new LocalStrategy(
    function(username, password, done) {
      User
        .validate({$or: [username: username, email: email]})
        .then(function(user) {
          return done(null, user);
        })
        .error(function(error) {
          return done(null, false, {message: 'Incorrect Login.'});
        });
    }
  ));

  // XXX add additional strategies below
};
