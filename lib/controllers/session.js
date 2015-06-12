'use strict';

var log = require('../log.js').getLogger(__filename),
    _ = require('underscore'),
    user = require('./user'),
    passport = require('passport'),

    // Modify this if need be. Determines how quick we want forge to sync with
    // server.
    SYNC_TIME = 5000

    ;

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
        req.session.allowSync = true;

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
  // any time there is a sync, start a timer. Server will ignore any further syncs until time is up.
  if (req.session.allowSync) {
    user.update(req.body);

    req.session.sync = false;

    //
    var timer = setTimeout(function(sync, timer) {
      sync = true;
      clearTimeOut(timer);
    }, SYNC_TIME, req.session.sync, timer);
  } else {
    log.warn('Attempted to sync faster than allotted time!');
  }
};
