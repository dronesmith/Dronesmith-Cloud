'use strict';

var log = require('../log.js').getLogger(__filename),
    _ = require('underscore'),
    passport = require('passport');

// Logs in.
// TODO send back proper response.
exports.authenticate = passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/'
  }
);

// Logs out.
exports.deauth = function(req, res, next) {
  //
};


// Handles all the forge syncing
exports.sync = function(req, res, next, id) {
  //
};
