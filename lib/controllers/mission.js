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

exports.removeMission = function() {
  // TODO
};

exports.find = function(req, res, next) {
  // TODO
};

exports.all = function(req, res, next) {
  // TODO
};
