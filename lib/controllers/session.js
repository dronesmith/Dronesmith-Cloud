'use strict';

var log = require('../log.js').getLogger(__filename),
    _ = require('underscore'),
    passport = require('passport');

// Logs in.
// TODO send back proper response.
exports.authenticate = function(req, res, next) {
  if (req.body.deauth) {
    req.logout();
    req.session.destroy();
    res.json({userData: null});
  } else {
    passport.authenticate('local', function(err, user, info) {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res
                .status(400)
                .json({'error': 'Invalid Username or password'});
      }

      req.logIn(user, function(err) {
        if (err) {
          return next(err);
        }

        // TODO only copy over fields we want them to see
        req.session.userData = req.user;

        // XXX This is ugly, but will do for now.
        delete req.session.cryptPass;
        delete req.session.cryptSalt;

        return res.json(user);
      });

    })(req, res, next);
  }
};

// Send back session
exports.poll = function(req, res, next) {
  var passData = req.session.passport;

  if (!req.session || !req.session.hasOwnProperty('userData')) {
    res.json(null);
  } else {
    res.json({userData: req.session.userData});
  }
}


// Handles all the forge syncing
exports.sync = function(req, res, next, id) {
  //
};
