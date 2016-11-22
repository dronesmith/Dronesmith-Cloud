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

  if (data.simId) {
    Drone
      .findOne({simId: data.simId})
      .exec(getDrone)
    ;
  } else if (!data.serialId) {
    return cb('No Firmware Id or Sim Id');
  } else {
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
  }

  //
  // Callbacks
  //

  function getUser(err, user) {
    if (err) {
      return cb(err);
    } else if (user && user.validPassword(data.password)) {
      userDoc = user;
      Drone
        .findOne({firmwareId: data.serialId})
        .exec(getDrone);
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
      if (data.simId) {
        // No drone, but we have a sim Id? Something bad happened.
        cb("Cannot create a drone object with a simId - drone object should already be created!!");
      } else {
        var drone = new Drone({
          sensors: {},
          firmwareId: data.serialId
        });

        drone.save(saveDrone);
      }
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
    if (!error) {
      drone.online = true;
      drone.updated = new Date();
      drone.save();
      return res.json({status: "OK", drone: drone, user: user});
    } else {
      return res.status(400).json({error: error});
    }
  });
}

exports.getSensor = function(req, res, next) {
  getDronesFromUser(req.headers['user-email'], function(drones, err) {
    if (!drones) {
      return res.status(400).json({error: err});
    }
    var foundDrone = null;
    for (var i = 0; i < drones.length; ++i) {
      var drone = drones[i];
      if ((drone.name == req.params.name) || (drone._id == req.params.name)) {
        foundDrone = drone;
      }
    }

    if (foundDrone) {

      if (!drone.sensors) {
        return res.status(400).json({error: "No sensor information for this drone."});
      }

      if (!drone.sensors[req.params.payload]) {
        return res.status(400).json({error: "No sensor information for " + req.params.payload});
      }
      return res.json(drone.sensors[req.params.payload]);
    } else {
      return res.status(400).json({error: "Could not find drone with name or id: "+req.params.name});
    }
  });
}

exports.updateSensor = function(req, res, next) {
  getDronesFromUser(req.headers['user-email'], function(drones, err) {
    if (!drones) {
      return res.status(400).json({error: err});
    }
    var foundDrone = null;
    for (var i = 0; i < drones.length; ++i) {
      var drone = drones[i];
      if ((drone.name == req.params.name) || (drone._id == req.params.name)) {
        foundDrone = drone;
      }
    }

    if (foundDrone) {
      if (!drone.sensors) {
          drone.sensors = {};
      }

      drone.sensors[req.params.payload] = req.body;
      Drone.findOneAndUpdate({_id: drone._id}, {$set: {sensors: drone.sensors}}, function(err) {
        if (err) {
          return next(err);
        } else {
          return res.json({status: "OK"});
        }
      });

    } else {
      return res.status(400).json({error: "Could not find drone with name or id: "+req.params.name});
    }
  });
}

exports.updateSensorRt = function(req, res, next) {
  Drone
    .findOne({_id: utils.castDocumentId(req.params.name)})
    .exec(function(err, drone) {
      if (err) return next(err);
      if (!drone) {
        return res.status(400).json({error: err});
      } else {
        if (!drone.sensors) {
            drone.sensors = {};
        }

        if (!drone.sensors[req.params.payload]) {
          drone.sensors[req.params.payload] = req.body;
        }

        Drone.findOneAndUpdate({_id: drone._id}, {$set: {sensors: drone.sensors}}, function(err) {
          if (err) {
            return next(err);
          } else {
            return res.json({status: "OK"});
          }
        });
        return res.json({status: "OK"});
      }
    })
  ;
}

// XXX not very happy with the structure of this routine at all.
// But don't really have time to improve and we're gonna leave mongo for
// a DB that can do joins anyways, so leave for now.
exports.getSimDrones = function(req, res, next) {
  simdrone.getAllContainers(function(containers, err) {

    var ids = [];
    _.each(containers, function(val) {
      ids.push(val.Id);
    });

    Drone
      .find({simId: {$in: ids}})
      .exec(function(err, drones) {

        if (drones) {
          ids = [];
          _.each(drones, function(val) {
            ids.push(val._id);
          });

          User
            .find({drones: {$in: ids}})
            .exec(function(err, users) {
              if (users) {
                var quickView = [];

                _.each(containers, function(container) {
                  _.each(drones, function(drone) {
                    if (drone.simId == container.Id) {
                      _.each(users, function(user) {
                        _.each(user.drones, function(userdrone) {
                          if (''+userdrone == ''+drone._id) {
                            quickView.push({
                              name: container.Names,
                              state: container.State,
                              status: container.Status,
                              user: user.email
                            });
                          }
                        });
                      });
                    }
                  });
                });
                res.json({info: quickView, containers: containers, error: err});
              } else {
                return next(err || "Found containers but no drone associated with it!");
              }
            });
        } else if (!drones) {
          res.josn({containers: containers, error: err});
        } else {
          return next(err);
        }
      })
    ;


  });
}

exports.getSimStats = function(req, res, next) {
  simdrone.getStatus(req.params.name, function(chunk, err) {
    res.json({containers: chunk, error: err});
  });
}

exports.startSim = function(req, res, next) {
  if (req.headers['admin-key']) {
    Drone.findOne({$or: [
      {_id: utils.castDocumentId(req.params.name)},
      {name: req.params.name}
    ]}, function(err, drone) {
      if (err) {
        return next(err);
      } else if (!drone) {
        return res.status(400).json({error: "No drone found"});
      } else {
        doStartSim(drone);
      }
    });
  } else {
    getDronesFromUser(req.headers['user-email'], function(drones, err) {
      if (!drones) {
        return res.status(400).json({error: err});
      }
      var foundDrone = false;
      for (var i = 0; i < drones.length; ++i) {
        var drone = drones[i];
        if ((drone.name == req.params.name) || (drone._id == req.params.name) || (drone.simId == req.params.name)) {
          foundDrone = true;
          doStartSim(drone);
          break;
        }
      }

      if (!foundDrone) {
        return res.status(400).json({error: "Could not find drone with name or id: "+req.params.name});
      }
    });
  }

  function doUpdateSim(drone) {
    log.info("Starting sim on", drone._id);
    simdrone.Update(drone.simId, false, function(error) {
      if (error) {
        return res.status(400).json({error: error});
      } else {
        return res.status(200).json({status: "OK"});
      }
    });
  }

  function doStartSim(drone) {
    // Since stopped drones delete containers now, we need to create a new one.
    if (!drone.simId) {
      log.info("Creating new sim.");
      simdrone.Make(drone.name, req.body.lat || 0.0, req.body.lon || 0.0, function(result, err) {
        if (err) {
          return next(err);
        } else if (result.Id) {
          var updateQuery =  {simId: result.Id};
          if (!drone.name) {
            updateQuery['name'] = result.Name;
          }
          Drone.findOneAndUpdate({_id: utils.castDocumentId(drone._id)}, {'$set': updateQuery}, function(err, newdrone) {
            if (err) {
              return next(err);
            } else {
              newdrone.simId = result.Id;
              doUpdateSim(newdrone);
            }
          });
        } else {
          res.status(400).json({error: "No virtual drone was created. This usually means the resources have been strained."});
        }
      });
    } else {
      doUpdateSim(drone);
    }
  }
}

exports.pauseSim = function(req, res, next) {
  if (req.headers['admin-key']) {
    Drone.findOne({$or: [
      {_id: utils.castDocumentId(req.params.name)},
      {name: req.params.name}
    ]}, function(err, drone) {
      if (err) {
        return next(err);
      } else if (!drone) {
        return res.status(400).json({error: "No drone found"});
      } else {
        doPauseSimDrone(drone);
      }
    });
  } else {
    getDronesFromUser(req.headers['user-email'], function(drones, err) {
      var foundDrone = false;
      for (var i = 0; i < drones.length; ++i) {
        var drone = drones[i];
        if ((drone.name == req.params.name) || (drone._id == req.params.name) || (drone.simId == req.params.name)) {
          foundDrone = true;
          doPauseSimDrone(drone);
          break;
        }
      }

      if (!foundDrone) {
        return res.status(400).json({error: "Could not find drone with name or id: "+req.params.name});
      }
    });
  }

  // NOTE
  // For now, kill any paused drones. Need to reduce the load on the server.
  function doPauseSimDrone(drone) {
    log.info("Removing sim", drone._id);
    simdrone.Kill(drone.simId, function(error) {
      if (error) {
        return res.status(400).json({error: error});
      } else {
        drone.simId = null;
        drone.save(function(error) {
          if (error) {
            return next(error);
          } else {
            return res.status(200).json({status: "OK"});
          }
        });
      }
    });

    // log.info("Pausing sim on", drone._id);
    // simdrone.Update(drone.simId, true, function(error) {
    //   if (error) {
    //     return res.status(400).json({error: error});
    //   } else {
    //     return res.status(200).json({status: "OK"});
    //   }
    // });
  }


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
          return res.status(400).json({error: "Drone with name " + req.params.name + " already exists."})
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
          simdrone.Make(d.name, req.body.lat || 0.0, req.body.lon || 0.0, function(result, err) {
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

  // Admin request. Find drone directly.
  if (req.headers['admin-key']) {
    Drone.findOne({$or: [
      {_id: utils.castDocumentId(req.params.name)},
      {name: req.params.name}
    ]}, function(err, drone) {
      if (err) {
        return next(err);
      } else if (!drone) {
        // NOTE - admin route only. Will attempt to kill the container even if no drone is associated with it.
        simdrone.Kill(req.params.name, function(err) {
          if (!err) {
            return res.status(400).json({error: "No drone found, but killed a container"});
          } else {
            return res.status(400).json({error: "No drone found and " + err});
          }
        })
      } else {
        doDelDrone(drone);
      }
    });
  } else {
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
        doDelDrone(foundDrone)
      }
    });
  }

  function doDelDrone(foundDrone) {
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


};

exports.update = function(req, res) {
  // req.body.updated = new Date();

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

    // keep readonly fields from being overwritten
    delete req.body._id;
    delete req.body.simId;
    delete req.body.created;
    delete req.body.online;

    if (req.body.groups && ((typeof req.body.groups) == 'object')) {
      if (req.body.groups['$set']) {
        var set = req.body.groups['$set'];
        if (set instanceof Array) {
          var groupSet = {};
          for (var i = 0; i < set.length; ++i) {
            groupSet[set[i]] = true;
          }
          req.body.groups = groupSet;
        } else {
          return res.status(400).json({error: "Cannot set groups: invalid type."});
        }
      }

      if (req.body.groups['$push']) {
        var push = req.body.groups['$push'];
        var groupSet = foundDrone.groups;
        if (push instanceof Array) {
          for (var i = 0; i < push.length; ++i) {
            groupSet[push[i]] = true;
          }
          req.body.groups = groupSet;
        } else {
          return res.status(400).json({error: "Cannot set groups: invalid type."});
        }
      }

      if (req.body.groups['$pull']) {
        var pull = req.body.groups['$pull'];
        var groupSet = foundDrone.groups;
        if (pull instanceof Array) {
          for (var i = 0; i < pull.length; ++i) {
            delete groupSet[pull[i]];
          }
          req.body.groups = groupSet;
        } else {
          return res.status(400).json({error: "Cannot set groups: invalid type."});
        }
      }
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

    if (new Date - drone.updated > 90 * 1000) {
      drone.online = false;
      drone.save();
    }

    return res.json(utils.getPublicDroneData(drone));
  });
};

exports.pruneInactive = function(time) {
  log.info("Prune: Begin prune sweep");
  Drone
    .find({})
    .exec(function(err, drones) {
      if (err || !drones) {
        return cb(err || new Error("No drones in DB"));
      } else {
        async.eachSeries(drones, function(drone, dronecb) {
          if (!drone.lastapicall || (drone.lastapicall && drone.simId && (new Date - drone.lastapicall > time * 1000))) {
            log.warn("Prune: Drone inactive, pruning", drone.name || drone._id);
            simdrone.Kill(drone.simId, function(error) {
              if (error) {
                log.error("Prune:", error);
                return dronecb(null, drone);
              } else {
                drone.simId = null;
                drone.lastapicall = new Date();
                drone.save(function(error) {
                  if (error) {
                    log.error("Prune:", error);
                    return dronecb(null, drone);
                  } else {
                    return dronecb(null, drone);
                  }
                });
              }
            });
          } else {
            return dronecb(null, drone);
          }
        }, function() {
          log.info("Prune: pruning done.");
        });
      }
    });
}

exports.findAll = function(req, res) {
  var query = null,
    findQuery = {},
    skip = null,
    attribs = {
    }
    ;

  var User = require('mongoose').model('User');

  User
    .findOne({email: req.headers['user-email']})
    // .populate('drones')
    .select({drones: 1})
    .exec(function(err, user) {
      if (err) {
        return res.status(500).json({error: err});
      } else if (!user) {
        return res.status(400).json({error: "No drones available."})
      } else {
        for (var k in req.query) {
          var prop = req.query[k];

          if (k == 'size' || k == 'page') {
            attribs[k] = +prop;
            continue;
          }

          if (k == 'groups') {
            var arr = prop.split(',');
            var obj = {};
            //
            for (var i = 0; i < arr.length; ++i) {
              findQuery[k+'.'+arr[i]] = {$exists: true};
            }
            //
            // attribs[k] = obj;
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

        // Limit to drones in user.
        findQuery["_id"] = {$in: user.drones};

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

                  retobject.drones = utils.getPublicDroneData(retobject.drones);

                  return res.json(retobject);
                }
              });
            }
           });
      }
    });
};
