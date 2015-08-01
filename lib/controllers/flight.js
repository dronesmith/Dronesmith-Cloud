'use strict';

var mongoose = require('mongoose'),
    User = mongoose.model('User'),
    Flight = mongoose.model('Flight'),
    log = require('../log.js').getLogger(__filename),
    Q = require('q'),
    async = require('async'),
    _ = require('underscore');

exports.findMission = function(req, res, next) {
  if (!req.hasOwnProperty('params') || !req.params.hasOwnProperty('userid')) {
    return res
            .status(400)
            .json({error: "No user id specified in route paramerters."})
          ;
  }

  User
    .findOne({_id: req.params.userid})
    .populate('flights')
    .exec(function(err, data) {
      if (err || !data) {
        return res
                .status(400)
                .json({error: err || "No user matched that id."})
              ;
      }

      res.json(data.flights);
    })
  ;
};

exports.addMission = function(req, res, next) {
  if (!req.hasOwnProperty('params')
  || !req.params.hasOwnProperty('userid')
  || !req.hasOwnProperty('body')) {
    return res
            .status(400)
            .json({error: "No user id or post object specified in route paramerters."})
          ;
  }

  (new Flight(req.body))
    .save(function(err, data) {
      User
        .findOneAndUpdate(
          {_id: req.params.userid},
          {
            $push: {
              'flights': data._id
            }
          })
        .exec(function(err, data) {
          if (err || !data) {
            return res
                    .status(400)
                    .json({error: err || "No user matched that id."})
                  ;
          }

          res.json(data);
        })
      ;
    })
  ;


};
