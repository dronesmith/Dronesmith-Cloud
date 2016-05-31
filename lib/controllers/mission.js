'use strict';

var mongoose = require('mongoose'),
    Mission = mongoose.model('Mission'),
    Drone = mongoose.model('Drone'),
    log = require('../log.js').getLogger(__filename),
    Q = require('q'),
    async = require('async'),
    _ = require('underscore'),
    utils = require('../utils'),
    sdlog = require('../sdlog.js'),
    mavlog = require('../mavlog.js'),
    fs = require('fs')

    ;

exports.associate = function(req, res, next) {
  Mission
    .findOneAndUpdate({_id: utils.castDocumentId(req.params.id)}, {user: utils.castDocumentId(req.body.user)})
    .exec(function(err, result) {
      if (err) {
        return res.status(500).json(err);
      } else if (!result) {
        return res.status(400).json({error: "Could not find mission."});
      } else {
        Drone
          .findOneAndUpdate({_id: utils.castDocumentId(req.body.drone)}, {$set: {missions: result._id}})
          .exec(function(err, result) {
            if (err) {
              return res.status(500).json(err);
            } else {
              return res.json({status: "OK"});
            }
          })
        ;
      }
    })
  ;
};

exports.addMission = function(req, res, next) {
        var chunk = null;

        async.waterfall([

          function(cb) {
            switch (req.params.format) {
              case 'mavlinkBinary':
                mavlog.binaryToJson(req.body, function(data) {
                  chunk = data;
                  if (data == null) {
                    return cb({error:"Invalid Binary MAVLink log format."});
                  }
                  return cb(null, chunk);
                });
                break;

              case 'mavlink':
                try {
                  chunk = JSON.parse(data);
                } catch(e) {
                  console.log(e);
                  return cb({error: "Invalid JSON mavlink log format."});
                }
                return cb(null, chunk);
                break;

              case 'sdlog':
                chunk = sdlog.parse(data);
                cb(null, chunk);
                break;

              default:
                return cb({error: "Invalid log format."});
            }
          },

          function(data, cb) {
            // write to DB
            var mission;
            if (req.params.format == 'mavlink'
            || req.params.format == 'mavlinkBinary') {
              mission = new Mission(chunk);
            } else {
              mission = new Mission();
              if (!chunk || chunk.length == 0) {
                return cb({error: "Invalid binary log format."});
              }
              mission.flight = chunk;
            }

            mission.kind = req.params.format;

            // user id is not required.
            if (req.session.userData) {
              mission.user = utils.castDocumentId(req.session.userData._id);
            }

            mission
              .save(function(err, data) {
                if (err) {
                  console.log(err);
                  return cb({error: err});
                }

                cb(null, data);
              })
            ;
          }
        ], function(err, result) {
          if (err) {
            return res.status(400).json(err);
          } else {
            return res.json({"status": "OK", id: result._id});
          }
        });
  ;
};

exports.remove = function(req, res, next) {
  Mission
    .findOneAndRemove({_id: utils.castDocumentId(req.params.id)},
      function(err, mission) {
        if (err) {
          return res
            .status(400)
            .json({error: err});
        } else {
          return res.json({status: 'OK'});
        }
    });
};

exports.find = function(req, res, next) {
  Mission.findOne({_id: utils.castDocumentId(req.params.id)}, function(err, mission) {
    if (err) {
      return res.status(500).json({error: err});
    } else if (!mission) {
      return res.status(400).json({error: "No mission found."});
    }
    return res.json(mission);
  });
};

exports.findAll = function(req, res, next) {
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


  // NOTE we don't want to return flights for all.
  query = Mission.find(findQuery).select({flight: 0});

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
    function(err, missions) {
      if (err) {
        return next(err);
      } else {
        Mission.count(findQuery, function(err, total) {
          if (err) {
            return next(err);
          } else {
            var retobject = {
              total:  total
            };

            if (attribs.size == 0) {
              retobject.size = 0;
              retobject.page = null;
              retobject.missions = [];
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
              retobject.missions = missions;
            }

            return res.json(retobject);
          }
        });
      }
     });
};
