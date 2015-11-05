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
          .save(function(err) {
            if (err) {
              console.log(err);
              return res
                .status(500)
                .json({error: err});
            }

            return res.json({"status": "OK"});
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

  // NOTE flight data can only be selected individually.
  query = Mission.find(findQuery).select({flight: 0});

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
    function(err, missions) {
      if (err) {
        res.render('error', {
          status: 500
        });
      } else {
        Mission.count(findQuery, function(err, total) {
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
                missions: missions
              });
          }
        });
      }
     });
};
