'use strict';

var mongoose = require('mongoose'),
    Mission = mongoose.model('Mission'),
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

      // console.log(files);

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

        try {
          var json = JSON.parse(data);
        } catch(e) {
          console.log(e);
          return res
            .status(400)
            .json({error: e});
        }

        // write to DB
        (new Mission(json))
          .save(function(err) {
            if (err) {
              return res
                .status(500)
                .json({error: e});
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
