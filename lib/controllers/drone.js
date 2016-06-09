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
    Drone = mongoose.model('Drone'),
    Mission = mongoose.model('Mission'),
    log = require('../log.js').getLogger(__filename),
    Q = require('q'),
    async = require('async'),
    _ = require('underscore'),
    mailer = require('../mailer.js')(),
    crypto = require('crypto'),
    Qs = require('qs'),
    utils = require('../utils'),
    uuid = require('uuid')

    ;


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

exports.remove = function(req, res) {
  Drone
    .findOneAndRemove({_id: utils.castDocumentId(req.params.id)},
      function(err, drone) {
        if (err) {
          return res
            .status(400)
            .json({error: err});
        } else {
          return res.json({status: 'OK'});
        }
    });
};

exports.update = function(req, res) {
  req.body.updated = new Date();
  if (req.body.parameters) {
    // Mongo won't let you post keys that have null.
    req.body.parameters = utils.scrubNull(req.body.parameters);
  }

  Drone
    .findOneAndUpdate(
    {_id: utils.castDocumentId(req.params.id)},
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
    .findOne({_id: utils.castDocumentId(req.params.id)})
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
