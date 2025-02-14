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

var log = require('../log.js').getLogger(__filename),
    _ = require('underscore'),
    user = require('./user'),
    passport = require('passport'),
    uuid = require('uuid'),
    utils = require('../utils.js'),
    // Modify this if need be. Determines how quick we want forge to sync with
    // server.

    SYNC_TIME = 5000,
    timers = {}

    ;



// Logs in.
// TODO send back proper response.
exports.authenticate = function(req, res, next) {
  if (req.body.deauth) {
    if (!req.session) {
      return res
        .status(400)
        .json({error: "You're not logged in."});
    }

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
                .json({'error': 'Invalid Username or password.'});
      }

      if (user.onWaitList) {
        return res
                .status(400)
                .json({error: "You're currently waitlisted. Sorry!\n"});
      }

      if (!user.isVerified) {
        return res
                .status(400)
                .json({error: "You need to verify your account!\n"});
      }

      if (req.body.deauth) {
        req.logout();
        req.session.destroy();
        res.json({userData: null});
      } else {
        req.logIn(user, function(err) {
          if (err) {
            return next(err);
          }

          // update user information
          user.lastLogin = new Date();
          user.ipAddr = req.ip;
          user.referringUrl = req.headers['referer'];
          user.userAgent = req.headers['user-agent'];
          user.save();

          // TODO only copy over fields we want them to see
          req.session.userData = req.user;
          req.session.uuid = uuid.v4();

          // XXX This is ugly, but will do for now.
          delete req.session.cryptPass;
          delete req.session.cryptSalt;

          return res.json(utils.getPublicUserData(user));
        });
      }
    })(req, res, next);
  }
};

// Send back session
exports.poll = function(req, res, next) {
  var passData = req.session.passport;

  if (!req.session || !req.session.hasOwnProperty('userData')) {
    res.json({"status": "expired"});
  } else {

    // filter for public user schema only.

    res.json({
      status: "active",
      lastUpdate: new Date(),
      userData: utils.getPublicUserData(req.session.userData)
    });
  }
};


// Handles all the forge syncing
exports.sync = function(req, res, next) {
  // XXX
  // This is ugly. But using the session create circular error in JSON.
  // Any way to do this better? I'd rather not keep this living directly in memory.
  var userSync = ''+req.session.passport.user+req.session.uuid;
  // log.debug(req.session);
  // log.debug(timers);
  if (!timers.hasOwnProperty(userSync)) {
    timers[userSync] = {
      allowSync: true,
      timer: null
    }
  }

  if (timers[userSync].allowSync == true) {
    req.session.lastUpdate = new Date();
    // user.update(req, res);

    timers[userSync].allowSync = false;

    timers[userSync].timer
        = setTimeout(function(userSync) {
          timers[userSync].allowSync = true;
          clearTimeout(timers[userSync].timer);
        }, SYNC_TIME, userSync);

    res.json(req.session.userData);
  } else {
    log.warn('Attempted to sync faster than allotted time!');
    res
      .status(200) // NOTE use case of having multiple browser windows open at once. The bottom line is,
                  // this is going to happen. We'll log it, but there's no reason to 400.
      .json({error: 'Attempted to sync faster than allotted time!\n Session Hash: ' + userSync});
  }
};
