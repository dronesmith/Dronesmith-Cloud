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

var mongoose = require('mongoose'),
    User = mongoose.model('User'),
    Drone = mongoose.model('Drone'),
    log = require('../log.js').getLogger(__filename),
    Q = require('q'),
    async = require('async'),
    _ = require('underscore'),
    crypto = require('crypto'),
    Qs = require('qs'),
    utils = require('../utils'),
    uuid = require('uuid'),
    sms = require('../sms'),
    config = require('../../config/config.js'),

    ITERATIONS = 10000,
    KEY_LEN = 128
    ;

exports.subscribe = function(req, res, next) {

}

exports.getSessionUser = function(req, res, next) {

  User
      .findOne({
          _id: mongoose.Types.ObjectId(req.session.userData._id)
      })
      .populate('drones')
      .exec(function(err, user) {
        if (err) {
          return new Error(err);
        }

        if (!user) {
          return res
            .status(400)
            .json({error: "Invalid session."})
          ;
        }

        return res.json(utils.getPublicUserData(user));
      })
  ;
}

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

//
// BEGIN ADMIN/TEST METHODS
//
exports.updatePassword = function(req, res, next) {
  req.assert('email', 'You must enter a valid email address').isEmail();
  req.assert('password', 'Password must be between 8-20 characters long').len(8, 20);

  var errors = req.validationErrors();

  if (errors) {
    log.error(errors);
    return res.status(400).send(errors);
  }

  User
    .findOne({email: req.body.email})
    .exec(function(err, user) {
      if (!err && user) {
        user.setPassword(req.body.password);
        user.save();
        return res
                .json(user);
      } else {
        return res
                 .status(400)
                 .json({error: err || "Email already taken."});
      }
    })
  ;
}

exports.generateUser = function(req, res, next) {
  var user = new User(req.body);

  // check that fields are here.
  if (!req.body.email || !req.body.password || !req.body.firstname
    || !req.body.lastname || !req.body.company) {
    return res.status(400).json({error: "The following fields are required: email, password, firstname, lastname, company"});
  }

  User
    .findOne({email: user.email})
    .exec(function(err, data) {
      if (err || data) {
        return res
                 .status(400)
                 .json({error: err || "Email already taken."});
      } else {
        user.setPassword(req.body.password);

        // tracking info
        user.ipAddr = req.ip;
        user.referringUrl = req.headers['referer'];
        user.userAgent = req.headers['user-agent'];
        user.apiKey = uuid.v4();

        User
          .count({})
          .then(function(count) {

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
              }

              if (config.keen.use) {
                global.KeenTracking.recordEvent('signup', {
                  env: KEEN_ENV,
                  tracking: {
                    email: user.email,
                    path: req.path,
                    ip: req.ip,
                    method: req.method,
                    url: req.url,
                    host: req.hostname,
                    referrer: req.headers['referer'],
                    userAgent: req.headers['user-agent'],
                    totalUsers: count
                  }
                });
              }

              return res.json(utils.getPublicUserData(user));
            });

          });
      }

    });
}

exports.generateKey = function(req, res, next) {
  return res.json({"key": uuid.v4() });
}

exports.generateUserKey = function(req, res, next) {
  User
    .findOneAndUpdate({_id: req.params.id}, {$set: {apiKey: uuid.v4()}})
    .exec(function(err) {
      if (err) {
        return res.status(500).json({error: err});
      } else {
        return res.json({status: "OK"});
      }
    });
}

//
// END ADMIN/TEST METHODS
//

exports.validatePassword = function(req, res, next) {
  User
    .findOne({$or: [
      {_id: utils.castDocumentId(req.params.id)},
      {email: req.params.id}
    ]})
    .select({
      email: 1,
      cryptSalt: 1,
      cryptPass: 1
    })
    .exec(function(err, user) {
      if (err || !user) {
        return res
          .status(400)
          .json({error: err || "User not found."});
      } else {
        var decoded = new Buffer(req.body.password, 'base64');
        if (user.validPassword(decoded)) {
          return res.json({"status": "OK"});
        } else {
          return res.json({"error": "Password invalid."});
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
    // req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);

    var errors = req.validationErrors();

    if (errors) {
      log.error(errors);
      return res.status(400).json({error: errors});
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
          var decoded = new Buffer(req.body.password, 'base64');
          user.setPassword(decoded);

          // tracking info
          user.ipAddr = req.ip;
          user.referringUrl = req.headers['referer'];
          user.userAgent = req.headers['user-agent'];
          user.apiKey = uuid.v4();

          user.language = user.language.toLowerCase();

          User
            .count({})
            .then(function(count) {

              user.save(function(err) {
                if (err) {
                  switch (err.code) {
                    case 11000:
                    case 11001:
                      log.error(err);
                      res.status(400).json({error: err.message || 'Email was already used.'});
                      break;
                    default:
                      log.error(err);
                      res.status(400).json({error: err.message || 'Please fill all the required fields'});
                  }
                } else {
                  if (config.keen.use) {
                    global.KeenTracking.recordEvent('signup', {
                      env: KEEN_ENV,
                      tracking: {
                        email: user.email,
                        path: req.path,
                        ip: req.ip,
                        method: req.method,
                        url: req.url,
                        host: req.hostname,
                        referrer: req.headers['referer'],
                        userAgent: req.headers['user-agent'],
                        totalUsers: count
                      }
                    });
                  }

                  return res.json(utils.getPublicUserData(user));

                  // mailer.sendWelcome(user);
                  // sms.SMSAuth(req.body.email, req.body.phone, req.body.country,
                  //   function(ret, err) {
                  //     if (!err && ret && ret.success) {
                  //       return res.json({user: utils.getPublicUserData(user), phone: ret});
                  //     } else if (ret && !ret.success || err && !err.success) {
                  //       return res.status(400).json({user: utils.getPublicUserData(user), phone: ret || err});
                  //     } else {
                  //        return next(err);
                  //     }
                  //   });
                }
              });

            });
        }

      });
};

exports.verifyPhone = function(req, res, next) {
  User
    .findOne({$or: [
      {_id: utils.castDocumentId(req.params.id)},
      {email: req.params.id}
    ]})
    .exec(function(err, user) {
      if (err || !user) {
        return res
          .status(400)
          .json({error: err || "User not found."});
      } else {
        sms.Verify(user.phone, user.country, req.body.code, function(result, err) {
          if (err) {
            return res.status(400).json({error: err});
          } else {
            return res.json(result);
          }
        });
      }
    })
  ;
}

exports.sendPhoneVerify = function(req, res, next) {
  if (!req.body.phone || !req.body.country) {
    return res.status(400).json({error: "Phone and country code required in post body."});
  }

  User
    .findOneAndUpdate({$or: [
      {_id: utils.castDocumentId(req.params.id)},
      {email: req.params.id}
    ]}, {phone: req.body.phone, country: req.body.country})
    .exec(function(err, user) {
      if (err || !user) {
        return res
          .status(400)
          .json({error: err || "User not found."});
      } else {
        sms.SMSAuth(user.email, req.body.phone, req.body.country, function(ret, err) {
          if (!err && ret && ret.success) {
            return res.json(ret);
          } else if (ret && !ret.success) {
            return res.status(400).json({error: ret});
          } else {
            return next(err);
          }
        });
      }
    })
  ;
}

// exports.sendMail = function(req, res, next) {
//   User
//     .findOne({$or: [
//       {_id: utils.castDocumentId(req.params.id)},
//       {email: req.params.id}
//     ]})
//     .exec(function(err, user) {
//       if (err || !user) {
//         return res
//           .status(400)
//           .json({error: err || "User not found with that email address."});
//       } else {
//         // mailer.sendWelcome(user);
//         return res.json({status: "OK"});
//       }
//     })
//   ;
// }

// exports.forgotPassword = function(req, res, next) {
//           User
//             .findOne({$or: [
//               {_id: utils.castDocumentId(req.params.id)},
//               {email: req.params.id}
//             ]})
//             .exec(function(err, user) {
//               if (err || !user) {
//                 return res
//                   .status(400)
//                   .json({error: err || "User not found with that email address."});
//               }
//               //only take time to generate new password if the user actually exists
//               else if (user) {
//                 var newPassword = {
//                   password: Array(10).join((Math.random().toString(36)+'00000000000000000').slice(2, 18)).slice(0, 9)
//                 }
//                 var salt = crypto.randomBytes(64).toString('base64');
//                 newPassword.cryptPass = crypto.pbkdf2Sync(newPassword.password, salt, ITERATIONS, KEY_LEN, 'sha512').toString('base64');
//                 newPassword.cryptSalt = salt;
//
//                 User
//                    .findOneAndUpdate({$or: [
//                      {_id: utils.castDocumentId(req.params.id)},
//                      {email: req.params.id}
//                    ]}, {cryptPass: newPassword.cryptPass, cryptSalt: newPassword.cryptSalt}, function(error, doc, result){})
//                   //  mailer.resetPassword(user.email, newPassword.password);
//                    return res.json(user);
//                  }
//                }
//              );
//
// };

exports.user = function(req, res, next, id) {
    User
        .findOne({$or: [
            {_id: id},
            {email: id}
          ]
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
      .findOne({$or: [
        {_id: utils.castDocumentId(req.params.id)},
        {email: req.params.id}
      ]})
      .select({
        email: 1,
        cryptPass: 1,
        cryptSalt: 1,
        company: 1,
        firstName: 1,
        lastName: 1,
        language: 1,
        phone: 1,
        country: 1,
        isVerified: 1,
        isVerifiedEmail: 1,
      })
      .exec(function(err, user) {
          if (err) {
            return next(err);
          } else if (!user) {
            return res
                    .status(400)
                    .json({error: "Failed to load/update user."});
          } else {
            // if (user.validPassword(req.body.password)) {
              if (req.body.password) {
                var decoded = new Buffer(req.body.password, 'base64');
                user.setPassword(decoded);
              }

              if (req.body.email) {
                User.findOne({email: req.body.email}, function(err, sameuser) {
                  if (err) {
                    return next(err);
                  } else if (sameuser) {
                    return res.status(400).json({error: "Cannot update email: a user already exists with this email."});
                  } else {
                    handleSave();
                  }
                });
              } else {
                handleSave();
              }

              function handleSave() {
                _.extendOwn(user, req.body);
                user.ipAddr = req.ip;
                user.referringUrl = req.headers['referer'];
                user.userAgent = req.headers['user-agent'];
                user.save(function(err) {
                  if (!err) {
                    if (req.session) {
                      req.session.userData = user;
                    }
                    res.json({status: "OK"});
                  } else {
                    return res.status(400).json({error: err});
                  }
                });
              }
            // } else {
            //   return res.status(400).json({error: "Invalid password."});
            // }
          }
      });
};

exports.destroy = function(req, res, next) {

  User
    .findOneAndRemove({$or: [
      {_id: utils.castDocumentId(req.params.id)},
      {email: req.params.id}
    ]})
    .exec(function(err) {
      if (err) {
        return res.status(400).json({error: err});
      } else {
        return res.json({status: "OK"});
      }
    })
  ;
};


// exports.all = function(req, res) {
//     User.find().sort('-created').populate('user', 'name username').exec(function(err, users) {
//         if (err) {
//             res.render('error', {
//                 status: 500
//             });
//         } else {
//             res.jsonp(users);
//         }
//     });
// };

exports.findAll = function(req, res) {

  var query = null,
    findQuery = {},
    skip = null,
    attribs = {
    }
    ;

  for (var k in req.query) {
    var prop = req.query[k];

    if (k == 'size' || k == 'page') {
      attribs[k] = +prop;
      continue;
    }

    if (k == 'sort') {
      var subProp = prop.substring(1);
      var prefix = prop[0];
      attribs[k] = {};

      if (prop == 'id') prop = '_id';
      if (subProp == 'id') subProp = '_id';

      if (prefix == '-') {
        attribs[k][subProp] = -1;
      } else {
        attribs[k][prop ] = 1;
      }
      continue;
    }

    findQuery[k] = prop;
  }

  query = User.find(findQuery);

  if (attribs.sort) {
    query = query.sort(attribs.sort);
  }

  if (attribs.page && attribs.page > 0 && attribs.size) {
    skip = (attribs.page-1) * attribs.size;
    query = query.skip(skip);
  } else {
    attribs.page = null;
  }

  if (attribs.size && attribs.size > 0) {
    query = query.limit(attribs.size);
  } else {
    attribs.size = 10;
    query = query.limit(10);
  }

  query.exec(
    function(err, users) {
      if (err) {
        return next(err);
      } else {
        User.count(findQuery, function(err, total) {
          if (err) {
            return next(err);
          } else {
            var retobject = {
              total:  total
            };

            if (attribs.size == 0) {
              retobject.size = 0;
              retobject.page = null;
              retobject.users = [];
            } else {
              if (skip > total) {
                skip = total;
              }

              if (attribs.size > total) {
                retobject.size = total;
              } else if (attribs.page > 0 && (attribs.size > (total - skip))) {
                retobject.size = total - skip;
              } else {
                retobject.size = attribs.size || total;
              }
              retobject.page = attribs.page || null;
              retobject.users = utils.getPublicUserData(users);
            }

            return res.json(retobject);
          }
        });
      }
     });
};

// find user by id for /index/
exports.find = function(req, res) {
  User
    .findOne({$or: [
      {_id: utils.castDocumentId(req.params.id)},
      {email: req.params.id},
    ]})
    .populate('drones')
    .exec(function(err, user) {
      if (err) {
        return res.status(500).json({error: err});
      } else if (!user) {
        return res.status(400).json({error: "No user found."});
      }
      return res.json(utils.getPublicUserData(user));
  });
};

// find user for API, no ID required
exports.findAPI = function(req, res) {
  User
    .findOne({email: req.headers['user-email'] })
    .populate('drones')
    .exec(function(err, user) {
      if (err) {
        return res.status(500).json({error: err});
      } else if (!user) {
        return res.status(400).json({error: "No user found."});
      }
      return res.json(utils.getPublicUserData(user));
  });
};

exports.addDrone = function(req, res) {

  var drone = utils.castDocumentId(req.params.drone_id);
  var query = {};

  if (!utils.castDocumentId(req.params.id)) {
    query.email = req.params.id;
  } else {
    query._id  = req.params.id;
  }

  // ignore ids that don't exist
  Drone
    .findOne({_id: drone})
    .select({parameters: 0}) // else this query will be extremely slow
    .exec(function(err, drones) {
      if (err) {
        return res.status(400).json({error: err});
      } else if (!drones) {
        return res.status(400).json({error: "Drone Id not found."})
      } else {
        // id found, update and remove duplicates.
        User
          .findOne(query,
            // {$push: {missions: utils.castDocumentId(req.body.missionId)}},
            function(err, user) {
              if (err) {
                return res.status(400).json({error: err});
              } else if (!user) {
                return res.status(400).json({error: "Could not find user"});
              } else {

                if (user.email != req.headers['user-email']) {
                  return res.status(401).json({error: "Not authorized"});
                }

                user.drones.push(drone);
                // remove duplicates
                var seen = {};
                user.drones = user.drones.filter(function(item) {
                  return seen.hasOwnProperty(item) ? false : (seen[item] = true);
                });

                user.save(function(err) {
                  if (err) {
                    return res.status(400).json({error: err});
                  } else {
                    return res.json({"status": "OK"});
                  }
                });
              }
            });
      }
    });

  // User
  //   .findOneAndUpdate(
  //     {_id: req.params.id},
  //     {$push: {drones: utils.castDocumentId(req.params.drone_id)}},
  //     function(err, result) {
  //       if (err) {
  //         return res.status(400).json({error: err});
  //       } else {
  //         return res.json({"status": "OK"});
  //       }
  //     });
};

exports.removeDrone = function(req, res) {
  var drone = utils.castDocumentId(req.params.drone_id);
  var query = {};

  if (!utils.castDocumentId(req.params.id)) {
    query.email = req.params.id;
  } else {
    query._id  = req.params.id;
  }

  // ignore ids that don't exist
  Drone
    .findOne({_id: drone})
    .select({parameters: 0}) // else this query will be extremely slow
    .exec(function(err, drones) {
      if (err) {
        return res.status(400).json({error: err});
      } else if (!drones) {
        return res.status(400).json({error: "Drone Id not found."})
      } else {
        // id found, update and remove duplicates.
        User
          .findOne(query,
            // {$push: {missions: utils.castDocumentId(req.body.missionId)}},
            function(err, user) {
              if (err) {
                return res.status(400).json({error: err});
              } else if (!user) {
                return res.status(400).json({error: "Could not find user"});
              } else {

                if (user.email != req.headers['user-email']) {
                  return res.status(401).json({error: "Not authorized"});
                }

                user.drones = _.difference(user.drones, [utils.castDocumentId(drone)]);

                user.save(function(err) {
                  if (err) {
                    return res.status(400).json({error: err});
                  } else {
                    return res.json({"status": "OK"});
                  }
                });
              }
            });
      }
    });
};
