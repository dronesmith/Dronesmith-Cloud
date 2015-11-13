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
    formidable = require('formidable'),
    fs = require('fs')

    ;

exports.addMission = function(req, res, next) {

  (new formidable.IncomingForm())
    .parse(req, function(err, fields, files) {

      if (err) {
        return res
          .status(500)
          .json({error: err});
      }

      if (!files.file) {
        return res
          .status(400)
          .json({error: "Could not parse file."});
      }

      fs.readFile(files.file.path, function(err, data) {

        if (err) {
          return res
            .status(500)
            .json({error: err});
        }

        var chunk = null;

        switch (req.params.format) {
          case 'mavlink':
            try {
              chunk = JSON.parse(data);
            } catch(e) {
              console.log(e);
              return res
                .status(400)
                .json({error: "Invalid mavlink log format."});
            }
            break;

          case 'sdlog':
            chunk = sdlog.parse(data);
            break;
        }



        // write to DB
        var mission;
        if (req.params.format == 'mavlink') {
          mission = new Mission(chunk);
        } else {
          mission = new Mission();
          if (!chunk || chunk.length == 0) {
            return res.json({error: "Invalid binary log format."});
          }
          mission.flight = chunk;
        }

        mission.kind = req.params.format;
        mission.user = utils.castDocumentId(req.session.userData._id);

        mission
          .save(function(err, data) {
            if (err) {
              console.log(err);
              return res
                .status(500)
                .json({error: err});
            }

            return res.json({"status": "OK", id: data._id});
          })
        ;
      });
    })
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
        return res.render('error', {
          status: 500
        });
      } else {
        Mission.count(findQuery, function(err, total) {
          if (err) {
            return res.render('error', {
              status: 500
            });
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
