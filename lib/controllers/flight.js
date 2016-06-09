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

  // TODO restify this

  // console.log(req.query);

  User
    .findOne({_id: req.params.userid})
    .populate('flights')
    // .populate(
    //     'flights',
    //     null,
    //     {flights: {$elemMatch: req.query}})
    .exec(function(err, data) {
      if (err || !data) {

        // search for flight then.

        Flight
          .findOne({_id: req.params.userid})
          .exec(function(err, data) {
            if (err || !data) {
              return res
                      .status(400)
                      .json({error: err || "No user matched that id."})
                    ;
            } else {
              res.json(data);
            }
          })
      } else {
        res.json(data.flights);
      }
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
    .save(function(err, flightdata) {
      User
        .findOneAndUpdate(
          {_id: req.params.userid},
          {
            $push: {
              'flights': flightdata._id
            }
          })
        .exec(function(err, data) {
          if (err || !data) {
            return res
                    .status(400)
                    .json({error: err || "No user matched that id."})
                  ;
          }

          res.json({flight: flightdata._id});
        })
      ;
    })
  ;


};
