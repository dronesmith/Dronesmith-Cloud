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

  Drone
    .findOneAndUpdate(
      {_id: req.params.id},
      {$push: {missions: utils.castDocumentId(req.body.missionId)}},
      function(err, result) {
        if (err) {
          return res.status(400).json({error: err});
        } else {
          return res.json({"status": "OK"});
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
    .populate('missions')
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
    attribs = {
    }
    ;

  for (var k in req.query) {
    var prop = req.query[k];

    if (k == 'size' || k == 'offset') {
      attribs[k] = +prop;
      continue;
    }

    if (k == 'sort') {
      var subProp = prop.substring(1);
      var prefix = prop[0];

      if (prefix == '-' || prefix == '+') {
        attribs[k] = {subProp: prefix == '-' ? -1 : 1};
      }
      continue;
    }

    findQuery[k] = prop;
  }

  findQuery = utils.castQueryParameters(findQuery);
  // console.log(findQuery);
  query = Drone.find(findQuery);

  if (attribs.sort) {
    query = query.sort(attribs.sort);
  }

  if (attribs.offset) {
    query = query.skip(attribs.offset * (attribs.size || 1));
  }

  if (attribs.size) {
    query = query.limit(attribs.size);
  }

  query.exec(
    function(err, drones) {
      if (err) {
        res.render('error', {
          status: 500
        });
      } else {
        Drone.count(findQuery, function(err, total) {
          if (err) {
            res.render('error', {
              status: 500
            });
          } else {
            res.json(
              {
                total:  total,
                size:   attribs.size,
                offset: attribs.offset,
                drones: drones
              });
          }
        });
      }
     });
};
