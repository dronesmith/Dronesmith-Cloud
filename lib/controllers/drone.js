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
    Mission = mongoose.model('Mission'),
    log = require('../log.js').getLogger(__filename),
    simdrone = require('../simdrone.js'),
    Q = require('q'),
    async = require('async'),
    _ = require('underscore'),
    mailer = require('../mailer.js')(),
    crypto = require('crypto'),
    Qs = require('qs'),
    utils = require('../utils'),
    uuid = require('uuid')

    ;

// Determines if a name is unique or not.
function getDronesFromUser(email, cb) {
  User
    .findOne({email: email})
    .populate('drones')
    .exec(function(err, user) {
      if (err) {
        cb(null, err);
      } else if (!user) {
        cb(null, "No drones available.");
      } else {
        cb(user.drones, null);
      }
    })
  ;
}

// Authenticate user and grabs drone from DB.
// If no drone exists, it creates one.
function processDrone(data, cb) {
  var
    userDoc = null,
    droneDoc = null;

  if (!data.serialId) {
    return cb('Firmware Id required');
  }

  User
    .findOne({email: data.email})
    .select({
      email: 1,
      cryptPass: 1,
      cryptSalt: 1,
      drones: 1
    })
    .exec(getUser)
  ;

  //
  // Callbacks
  //

  function getUser(err, user) {
    if (err) {
      return cb(err);
    } else if (user && user.validPassword(data.password)) {
      userDoc = user;

      if (data.simId) {
        Drone
          .findOne({simId: data.simId})
          .exec(getDrone)
      } else {
        Drone
          .findOne({firmwareId: data.serialId})
          .exec(getDrone);  
      }
    } else {
      return cb('Invalid Credentials');
    }
  }

  function getDrone(err, drone) {
    if (err) {
      return cb(err);
    } else if (drone) {
      // just send back the drone in the DB
      return cb(null, drone, userDoc);
    } else {
      var drone = new Drone({
        parameters: {},
        firmwareId: data.serialId
      });

      drone.save(saveDrone);
    }
  }

  function saveDrone(err, drone) {
    if (err) {
      return cb('Error creating drone');
    }

    droneDoc = drone;
      userDoc.drones.push(drone._id);
      userDoc.save(updateUser);
    }

  function updateUser(err) {
    if (err) {
      return cb('Error updating user');
    }

    return cb(null, droneDoc, userDoc);
  }
}

exports.rtRequest = function(req, res, next) {
  processDrone(req.body, function(error, drone, user) {
    //console.log(error, drone, user);
    if (!error) {
      return res.json({status: "OK", drone: drone, user: user});
    } else {
      return res.status(400).json({error: error});
    }
  });
}

exports.startSim = function(req, res, next) {
  getDronesFromUser(req.headers['user-email'], function(drones, err) {
    var foundDrone = false;
    for (var i = 0; i < drones.length; ++i) {
      var drone = drones[i];
      if ((drone.name == req.params.name) || (drone._id == req.params.name) || (drone.simId == req.params.name)) {
        foundDrone = true;
        log.info("Starting sim on", drone._id);
        simdrone.Update(drone.simId, false, function(error) {
          if (error) {
            return res.status(400).json({error: error});
          } else {
            return res.status(200).json({status: "OK"});
          }
        });
        break;
      }
    }

    if (!foundDrone) {
      return res.status(400).json({error: "Could not find drone with name or id: "+req.params.name});
    }
  });
}

exports.pauseSim = function(req, res, next) {
  getDronesFromUser(req.headers['user-email'], function(drones, err) {
    var foundDrone = false;
    for (var i = 0; i < drones.length; ++i) {
      var drone = drones[i];
      if ((drone.name == req.params.name) || (drone._id == req.params.name) || (drone.simId == req.params.name)) {
        foundDrone = true;
        log.info("Pausing sim on", drone._id);
        simdrone.Update(drone.simId, true, function(error) {
          if (error) {
            return res.status(400).json({error: error});
          } else {
            return res.status(200).json({status: "OK"});
          }
        });
        break;
      }
    }

    if (!foundDrone) {
      return res.status(400).json({error: "Could not find drone with name or id: "+req.params.name});
    }
  });
}

exports.createSim = function(req, res, next) {
  getDronesFromUser(req.headers['user-email'], function(drones, err) {
    if (!err) {
      var pNameUsed = false;

      if (req.params.name) {
        pNameUsed = true;
      }

      for (var i = 0; i < drones.length; ++i) {
        var drone = drones[i];
        if (pNameUsed && (drone.name == req.params.name)) {
          return res.status(400).json({error: "Drone with" + req.params.name + " already exists."})
          break;
        }
      }

      // Create a drone
      var d = new Drone({
        name: req.params.name,
        type: "Virtual Drone"
      });

      d.save(function(err) {
        if (!err) {
          log.info("Initializing", d.name || d._id);
          simdrone.Make(d.name, function(result, err) {
            if (err) {
              return next(err);
            } else if (result.Id) {
              var updateQuery =  {simId: result.Id};
              if (!req.params.name) {
                updateQuery['name'] = result.Name;
              }
              Drone.findOneAndUpdate({_id: utils.castDocumentId(d._id)}, {'$set': updateQuery}, function(err, drone) {
                if (err) {
                  return next(err);
                } else {
                  // Add drone to user.
                  User.findOneAndUpdate(
                    {email: req.headers['user-email']},
                    {'$push': {drones: utils.castDocumentId(d._id)}},
                    function(err, user) {
                    if (err) {
                      return next(err);
                    } else {
                      Drone.findOne({_id: utils.castDocumentId(d._id)}, function(err, drn) {
                        if (err) {
                          return next(err);
                        } else {
                          res.json(drn);
                        }
                      });
                    }
                  });

                  // res.json(drone);
                }
              })
            } else {
              res.status(400).json({error: "Virtual environment could not be created."});
            }
          });
        } else {
          return next(err);
        }
      });
    } else {
      res.status(400).json({error: err})
    }
  });
}

exports.sendCmd = function(req, res, next) {
  Drone
    .findOne({$or: [
      {_id: utils.castDocumentId(req.params.name)},
      {name: req.params.name}
    ]})
    .exec(function(err, drone) {
      if (err) {
        next(err);
      } else if (!drone) {
        res.status(400).json({error: "Could not find Drone"});
      } else {
        var good = require('../datalinks/dronelink')
          .Singleton()
          .sendCommand(drone, req.body.command, req.body.params)
        ;

        if (good) {
          res.json({status: "OK"});
        } else {
          res.status(400).json({error: "Command failed."});
        }

      }
    })
  ;
};

exports.getTelemetry = function(req, res, next) {
  Drone
    .findOne({$or: [
      {_id: utils.castDocumentId(req.params.name)},
      {name: req.params.name}
    ]})
    .exec(function(err, drone) {
      if (err) {
        next(err);
      } else if (!drone) {
        res.status(400).json({error: "Could not find Drone"});
      } else {
        var dl = require('../datalinks/dronelink').Singleton();
        if (!dl.live) {
          return res.status(400).json({error: "Drone is offline."});
        }
        var telem = dl.live(drone);

        if (!telem) {
          return res.status(400).json({error: "Drone is offline."});
        } else {
          return res.json({status: "OK", telemetry: telem});
        }
      }
    });
};

//
// TODO... this will be refactored for sim drones.
//
exports.create = function(req, res, next) {
    var drone = new Drone(req.body);

    var errors = req.validationErrors();

    if (errors) {
      log.error(errors);
      return res.status(400).json({error: errors});
    }

    // check for duplicates
    Drone
      .findOne({systemId: drone.systemId})
      .exec(function(err, data) {
        if (err || data) {
          return res
                   .status(400)
                   .json({error: err || "SystemId already taken."});
        } else {

          drone.save(function(err) {
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

            res.jsonp(drone);
          });
        }
      })
    ;
};

exports.remove = function(req, res, next) {
  getDronesFromUser(req.headers['user-email'], function(drones, err) {
    var foundDrone = null;
    for (var i = 0; i < drones.length; ++i) {
      var drone = drones[i];
      if ((''+drone._id == req.params.name) || (drone.name == req.params.name)) {
        foundDrone = drone;
      }
    }

    if (!foundDrone) {
      return res.status(400).json({error: "Could not find drone."});
    } else {
      if (foundDrone.simId) { // is a sim drone, so kill the container as well.
        log.info("Removing sim", foundDrone._id);
        simdrone.Kill(foundDrone.simId, function(err) {
          if (err) {
            return res.status(400).json({error: err});
          } else { // container dead, remove drone now.
            Drone
              .findOneAndRemove({_id: utils.castDocumentId(foundDrone._id)},
                function(err, drone) {
                  if (err) {
                    return res
                      .status(400)
                      .json({error: err});
                  } else {
                    User.findOneAndUpdate(
                      {email: req.headers['user-email']},
                      {$pull: {drones: utils.castDocumentId(foundDrone._id)}},
                      function(error, user) {
                        if (error) return next(error);
                        else res.json({status: 'OK'});
                      });
                  }
              });
          }
        });
      } else { // not a sim drone, just delete its metadata.
        Drone
          .findOneAndRemove({_id: utils.castDocumentId(foundDrone._id)},
            function(err, drone) {
              if (err) {
                return res
                  .status(400)
                  .json({error: err});
              } else {
                User.findOneAndUpdate(
                  {email: req.headers['user-email']},
                  {$pull: {drones: utils.castDocumentId(foundDrone._id)}},
                  function(error, user) {
                    if (error) return next(error);
                    else res.json({status: 'OK'});
                  });
              }
          });
      }
    }
  });


};

exports.update = function(req, res) {
  req.body.updated = new Date();
  if (req.body.parameters) {
    // Mongo won't let you post keys that have null.
    req.body.parameters = utils.scrubNull(req.body.parameters);
  }

  getDronesFromUser(req.headers['user-email'], function(drones, err) {
    var foundDrone = null;

    for (var i = 0; i < drones.length; ++i) {
      var drone = drones[i];
      if (drone.name == req.body.name) {
        return res.status(400).json({error: "Drones must have a unique name."});
      }
      if ((''+drone._id == req.params.id) || (drone.name == req.params.id)) {
        foundDrone = drone;
      }
    }

    if (!foundDrone) {
      return res.status(400).json({error: "Could not find drone with name or id."});
    }
    Drone
      .findOneAndUpdate(
      {_id: utils.castDocumentId(foundDrone._id)},
      req.body,
      {passRawResult: true},
      function(err, drone, updated) {
        if (err) {
          return res
            .status(400)
            .json({error: err});
        } else {
          return res.json({status: "OK"});
        }
      });
  });



};

exports.addMission = function(req, res) {
  if (!req.body.missionId) {
    return res.status(400).json({error: "Mission Id is required."});
  }

  var mission = utils.castDocumentId(req.body.missionId);

  // ignore ids that don't exist
  Mission
    .findOne({_id: mission})
    .select({flight: 0}) // else this query will be extremely slow
    .exec(function(err, missions) {
      if (err) {
        return res.status(400).json({error: err});
      } else if (!missions) {
        return res.status(400).json({error: "Mission Id not found."})
      } else {
        // id found, update and remove duplicates.
        Drone
          .findOne(
            {_id: req.params.id},
            // {$push: {missions: utils.castDocumentId(req.body.missionId)}},
            function(err, drone) {
              if (err) {
                return res.status(400).json({error: err});
              } else {

                drone.missions.push(mission)
                // remove duplicates
                var seen = {};
                drone.missions = drone.missions.filter(function(item) {
                  return seen.hasOwnProperty(item) ? false : (seen[item] = true);
                });

                drone.save(function(err) {
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

exports.removeMission = function(req, res) {
  if (!req.body.missionId) {
    return res.status(400).json({error: "Mission Id is required."});
  }

  Drone
    .findOneAndUpdate(
      {_id: req.params.id},
      {$pull: {missions: utils.castDocumentId(req.body.missionId)}},
      function(err, result) {
        if (err) {
          return res.status(400).json({error: err});
        } else {
          return res.json({"status": "OK"});
        }
      });
}

exports.find = function(req, res) {
  Drone
    .findOne({$or: [
      {_id: utils.castDocumentId(req.params.id)},
      {name: req.params.id}
    ]})
    // .populate('missions')
    .exec(function(err, drone) {
    if (err) {
      return res.status(500).json({error: err});
    } else if (!drone) {
      return res.status(400).json({error: "No drone found."});
    }
    return res.json(drone);
  });
};

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

  // cast numerics
  for (var k in findQuery) {
    if (!isNaN(findQuery[k])) {
      findQuery[k] = +findQuery[k];
    }
  }

  // NOTE we don't want to return parameters for all.
  query = Drone.find(findQuery);

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
  }

  query.exec(
    function(err, drones) {
      if (err) {
        return next(err);
      } else {
        Drone.count(findQuery, function(err, total) {
          if (err) {
            return next(err);
          } else {
            var retobject = {
              total:  total
            };

            if (attribs.size == 0) {
              retobject.size = 0;
              retobject.page = null;
              retobject.drones = [];
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
              retobject.drones = drones;
            }

            return res.json(retobject);
          }
        });
      }
     });
};

//
// Finding all drones for a user only.
//
exports.findAllAPI = function(req, res) {
  var User = require('mongoose').model('User');

  User
    .findOne({email: req.headers['user-email']})
    .populate('drones')
    .exec(function(err, user) {
      if (err) {
        return res.status(500).json({error: err});
      } else if (!user) {
        return res.status(400).json({error: "No drones available."})
      } else {
        return res.json({status: "OK", drones: user.drones});
      }
    })
  ;
}
