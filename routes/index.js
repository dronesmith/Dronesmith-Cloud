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

/**
 *
 * Routing table
 *
 */

var
  path = require('path'),
  passport = require('passport'),
  user = require('../lib/controllers/user'),
  session = require('../lib/controllers/session'),
  flight = require('../lib/controllers/flight'),
  drone = require('../lib/controllers/drone'),
  mission = require('../lib/controllers/mission'),
  mongoose = require('mongoose'),
  User = mongoose.model('User'),
  code = require('../lib/controllers/code'),
  appCtrl = require('../lib/controllers/app'),
  cloudbit = require('../lib/controllers/cloudbit');

module.exports = function(app, route) {
    // catchall route
    route
        .all('*', function (request, response, next) {
            // placeholder for catching each request
            next();
        })

        //
        // Promo route
        //
        // .get('/lucicam', function(req, res) {
        //   res.sendFile('promo/lucicam.html', { root: path.join(__dirname, '../forge-ux/public') });
        // })

        // .get('/hello', function(req, res) {
        //   res.send('world!');
        // })

        //
        // Index routes. These are accesible by the frontend and do not
        // require api keys.
        //

        // Authenticate a session (allows logins)
        // .post   ('/index/session',                session.authenticate)

        // Get user info
        // .get    ('/index/session',                session.poll)

        // .put('/api/session', session.sync)

        // User API for UX service
        .get    ('/index/user/',                      user.findAll)
        .get    ('/index/user/:id',                   user.find)
        .post   ('/index/user',                       user.create)
        .post   ('/index/user/:id/verifyPhone',       user.verifyPhone)
        .post   ('/index/user/:id/authPhone',         user.sendPhoneVerify)
        .post   ('/index/user/:id/password',          user.validatePassword)
        // .post   ('/index/user/:id/sendemail',         user.sendMail)
        // .post   ('/index/user/:id/forgotpassword',    user.forgotPassword)
        .put    ('/index/user/:id',                   user.update)
        .delete ('/index/user/:id',                   user.destroy)

        // NOTE
        // We'll let some methods also be index, so the user can upload flights.
        // .get    ('/index/mission/:id',            mission.find)
        // .get    ('/index/mission',                mission.findAll)
        // .put    ('/index/mission/:id/associate',  mission.associate)
        // .post   ('/index/mission/:format',        mission.addMission)
        //
        // .put    ('/index/drone/addMission/:id',   drone.addMission)
        // .delete ('/index/drone/:id',              drone.remove)
        // .put    ('/index/drone/:id',              drone.update)

        // Order here is important.
        // .post   ('/index/code/exec/run',          code.execNow)
        // .post   ('/index/code/exec/:id',          code.exec)
        // .post   ('/index/code/:drone',            code.create)
        // .put    ('/index/code/:id',               code.update)


        // Apps
        // .get    ('/index/app/',                   appCtrl.findAll)


        //
        // Forge Cloud API routes. An API key is required.
        //

        // User CRUD. Limiting these to read-only methods.
        // Headers are good enough.
        // .get    ('/api/user/',                    user.findAPI)

        // TODO - admin roles for finding all users.
        // .get    ('/api/user',                     user.findAll)

        // Add / remove drones
        // .put    ('/api/user/:id/:drone_id',       user.addDrone)
        // .delete ('/api/user/:id/:drone_id',       user.removeDrone)

        // drone CRUD
        .get    ('/api/drone/:id',                drone.find)
        .get    ('/api/drone',                    drone.findAllAPI)
        .post   ('/api/drone',                    drone.createSim)
        .post   ('/api/drone/:name',              drone.createSim)
        .post   ('/api/drone/:name/start',        drone.startSim)
        .post   ('/api/drone/:name/stop',         drone.pauseSim)
        .delete ('/api/drone/:name',              drone.remove)
        .put    ('/api/drone/:id',                drone.update)
        .post   ('/api/drone/:name/sensor/:payload', drone.updateSensor)
        .post   ('/rt/drone/:name/sensor/:payload', drone.updateSensorRt)
        .get   ('/api/drone/:name/sensor/:payload', drone.getSensor)
        // .post   ('/api/drone/:name/cmd',          drone.sendCmd)
        // .get    ('/api/drone/:name/live',         drone.getTelemetry)

        // add / remove missions
        // TODO make this /api/drone/<name>/mission DEL
        // .delete ('/api/drone/removeMission/:id',  drone.removeMission)
        // TODO remove this
        // .put    ('/api/drone/addMission/:id',     drone.addMission)

        // mission CRUD
        .get    ('/api/mission/:id',              mission.find)
        .get    ('/api/mission',                  mission.findAll)
        // .put    ('/api/mission/:id/associate',    mission.associate)
        // .post   ('/api/mission/:format',          mission.addMission)
        .delete ('/api/mission/:id',              mission.remove)

        .get    ('/api/', function(req, res) {
          return res.status(204).send();
        })

        // Code CRUD
        // .post   ('/api/code/exec/:id',            code.exec)
        // .post   ('/api/code/:drone',              code.create)
        // .put    ('/api/code/:id',                 code.update)
        // .get    ('/api/code/:id',                 code.find)
        // .get    ('/api/code',                     code.findAll)
        // .delete ('/api/code/:id',                 code.remove)

        // Apps
        // .get    ('/api/app/',                     appCtrl.findAll)

        //
        // Real time routes. These require a valid session Id.
        //
        .post   ('/rt/mission/:format',           mission.addMission)
        .put    ('/rt/mission/:id/associate',     mission.associate)
        .post   ('/rt/droneinfo',                 drone.rtRequest)

        //
        // Admin routes. These require the master key.
        //
        .post   ('/admin/user/updatepassword',    user.updatePassword)
        .post   ('/admin/user/generateUser',      user.generateUser)
        .get    ('/admin/user/generateKey',       user.generateKey)
        .post   ('/admin/user/generateUserKey/:id', user.generateUserKey)

        // .get('/api/cloudbit', cloudbit.get)
        // .post('/api/cloudbit', cloudbit.output)

        // Confirm Route. This is used by new user accounts to verify their
        // account.
        // .get    ('/:type([A-Z|a-z|0-9]{24})',     user.confirm)
    ;

    return route;
};
