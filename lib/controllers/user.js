'use strict';

var mongoose = require('mongoose'),
    User = mongoose.model('User'),
    log = require('../log.js').getLogger(__filename),
    _ = require('underscore');

exports.create = function(req, res, next) {
    var user = new User(req.body);

    req.assert('email', 'You must enter a valid email address').isEmail();
    req.assert('password', 'Password must be between 8-20 characters long').len(8, 20);
    req.assert('username', 'Username cannot be more than 20 characters').len(1, 20);
    req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);

    var errors = req.validationErrors();

    if (errors) {
      log.error(errors);
      return res.status(400).send(errors);
    }

    user.roles = req.body.roles || [];
    user.setPassword(req.body.password);
    user.setDefaultMods();
    user.ipAddr = req.connection.remoteAddress;

    log.debug(user);

    user.save(function(err) {
      if (err) {
        switch (err.code) {
          case 11000:
          case 11001:
            res.status(400).send('Username already taken');
            break;
          default:
            log.error(err);
            res.status(400).send(err.message || 'Please fill all the required fields');
        }

          return res.status(400);
      }

      res.jsonp(user);
    });
};


exports.user = function(req, res, next, id) {
    User
        .findOne({
            _id: id
        })
        .exec(function(err, user) {
            if (err) return next(err);
            if (!user) return next(new Error('Failed to load User ' + id));
            req.profile = user;
            next();
        });
};

exports.update = function(req, res) {
    var user = req.profile;
    user = _.extend(user, req.body);

    user.save(function(err) {
        res.jsonp(user);
    });
};

exports.destroy = function(req, res) {
    var user = req.profile;

    user.remove(function(err) {
        if (err) {
            res.render('error', {
                status: 500
            });
        } else {
            res.jsonp(user);
        }
    });
};


exports.all = function(req, res) {
    User.find().sort('-created').populate('user', 'name username').exec(function(err, users) {
        if (err) {
            res.render('error', {
                status: 500
            });
        } else {
            res.jsonp(users);
        }
    });
};
