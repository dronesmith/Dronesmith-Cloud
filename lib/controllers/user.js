'use strict';

var mongoose = require('mongoose'),
    User = mongoose.model('User'),
    log = require('../log.js').getLogger(__filename),
    Q = require('q'),
    async = require('async'),
    _ = require('underscore'),
    mailer = require('../mailer.js')(),

    ALPHA_ACCESS_MEMBER_COUNT = 200

    ;

exports.confirm = function(req, res, next) {

  User
    .findOne({_id: mongoose.Types.ObjectId(req.params.type)})
    .then(function(data, error) {
      if (error || !data) {
        return next();
      } else {
        if (data.isVerified) {
          return next();
        } else {
          User
            .count({isVerified: true})
            .then(function(count) {
              data.isVerified = true;

              if (count >= ALPHA_ACCESS_MEMBER_COUNT) {
                data.onWaitList = true;
              }

              data.save(function(err) {
                res.redirect('/?code='+encodeURIComponent(data._id)
                  +'&waitlist='+encodeURIComponent(data.onWaitList));
              });

            })
          ;
        }
      }
    })
  ;
}

exports.create = function(req, res, next) {
    var user = new User(req.body);

    req.assert('email', 'You must enter a valid email address').isEmail();
    req.assert('password', 'Password must be between 8-20 characters long').len(8, 20);
    // req.assert('username', 'Username cannot be more than 20 characters').len(1, 20);
    req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);

    var errors = req.validationErrors();

    if (errors) {
      log.error(errors);
      return res.status(400).send(errors);
    }

    // check for duplicates
    User
      .findOne({email: user.email})
      .exec(function(err, data) {
        if (err || data) {
          return res
                  .status(400)
                  .json({error: err || "Email already taken."});
        } else {

          user.setPassword(req.body.password);
          user.setDefaultMods();

          // tracking info
          user.ipAddr = req.connection.remoteAddress;
          user.referringUrl = req.headers['referer'];
          user.userAgent = req.headers['user-agent'];

          User
            .count({isVerified: true})
            .then(function(count) {
              if (count < ALPHA_ACCESS_MEMBER_COUNT) {
                user.onWaitList = false;
              } else {
                user.onWaitList = true;
              }

              user.save(function(err) {
                if (err) {
                  switch (err.code) {
                    case 11000:
                    case 11001:
                      log.error(err);
                      res.status(400).send(err.message || 'Email was already used.');
                      break;
                    default:
                      log.error(err);
                      res.status(400).send(err.message || 'Please fill all the required fields');
                  }

                    return res.status(400);
                }

                mailer.sendWelcome(user);
                res.jsonp(user);
              });

            });
        }

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

exports.update = function(req, res, next) {
  User
      .findOneAndUpdate({
          _id: mongoose.Types.ObjectId(req.query.userId)
      }, req.body)
      .exec(function(err, user) {
          if (err) {
            return new Error(err);
          } else if (!user) {
            return res
                    .status(400)
                    .json({error: "Failed to load/update user: " + req.query.email});
          } else {
            return res.json(user);  
          }
      });


    // var user = req.profile,
    //   deferred = Q.defer();
    // user = _.extend(user, req.body);
    //
    // console.log(user);
    //
    // if (user) {
    //   user
    //     .save(function(err) {
    //       Q.resolve(user);
    //     });
    // } else {
    //   Q.reject(user);
    // }

    // return deferred.promise;
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
