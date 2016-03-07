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

        // Check for global query strings
        .get('/', function(req, res, next) {
          if (req.query.code) {
            User
              .findOne({_id: req.query.code})
              .then(function(data, error) {
                if (error || !data) {
                  return res.redirect('/');
                } else {
                  if (req.query.waitlist) {
                    return res
                      .status(400)
                      .json({"error": "Uh oh, you missed your chance for early access! :("});
                    ;
                  } else {
                    return res
                      .json({"status": "ok"});
                    ;
                  }
                }
              })
            ;
          } else {
            return res.redirect('/');
          }
        })

        //
        // Promo route
        //
        .get('/lucicam', function(req, res) {
          res.sendFile('promo/lucicam.html', { root: path.join(__dirname, '../forge-ux/public') });
        })

        //
        // Index routes. These are accesible by the frontend and do not
        // require api keys.
        //

        // Authenticate a session (allows logins)
        .post   ('/index/session',                session.authenticate)

        // Get user info
        .get    ('/index/session',                session.poll)

        // .put('/api/session', session.sync)

        //
        .get    ('/index/user/',                  user.getSessionUser)

        // User creation
        .post   ('/index/user',                   user.create)

        // Send new password
        .put    ('/index/user/forgotpassword',    user.forgotPassword)

        // Update user account
        .put    ('/index/user/',                  user.update)

        // NOTE
        // We'll let some methods also be index, so the user can upload flights.
        .get    ('/index/mission/:id',            mission.find)
        .get    ('/index/mission',                mission.findAll)
        .post   ('/index/mission/:format',        mission.addMission)

        .put    ('/index/drone/addMission/:id',   drone.addMission)
        .delete ('/index/drone/:id',              drone.remove)
        .put    ('/index/drone/:id',              drone.update)

        // Order here is important.
        .post   ('/index/code/exec/run',          code.execNow)
        .post   ('/index/code/exec/:id',          code.exec)
        .post   ('/index/code/:drone',            code.create)
        .put    ('/index/code/:id',               code.update)


        // Apps
        .get    ('/index/app/',                   appCtrl.findAll)


        //
        // Forge Cloud API routes. An API key is required.
        //

        // User CRUD. Limiting these to read-only methods.
        .get    ('/api/user/:id',                 user.find)
        .get    ('/api/user',                     user.findAll)

        // Add / remove drones
        .put    ('/api/user/:id/:drone_id',       user.addDrone)
        .delete ('/api/user/:id/:drone_id',       user.removeDrone)

        // drone CRUD
        .get    ('/api/drone/:id',                drone.find)
        .get    ('/api/drone',                    drone.findAll)
        .post   ('/api/drone',                    drone.create)
        .delete ('/api/drone/:id',                drone.remove)
        .put    ('/api/drone/:id',                drone.update)

        // add / remove missions
        .delete ('/api/drone/removeMission/:id',  drone.removeMission)
        .put    ('/api/drone/addMission/:id',     drone.addMission)

        // mission CRUD
        .get    ('/api/mission/:id',              mission.find)
        .get    ('/api/mission',                  mission.findAll)
        .post   ('/api/mission/:format',          mission.addMission)
        .delete ('/api/mission/:id',              mission.remove)

        // Code CRUD
        .post   ('/api/code/exec/:id',            code.exec)
        .post   ('/api/code/:drone',              code.create)
        .put    ('/api/code/:id',                 code.update)
        .get    ('/api/code/:id',                 code.find)
        .get    ('/api/code',                     code.findAll)
        .delete ('/api/code/:id',                 code.remove)

        // Apps
        .get    ('/api/app/',                     appCtrl.findAll)

        //
        // XXX
        // Legacy support for parrot bro and the flight schema.
        //
        .get    ('/legacy/flight/:userid',        flight.findMission)
        .post   ('/legacy/flight/:userid',        flight.addMission)

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
        .get    ('/:type([A-Z|a-z|0-9]{24})',     user.confirm)
    ;

    if (app.get('env') === 'development') {
        route
            // tests for 404 and 500s
            .all('/404', function (req, res) {
                logger.warn("Can not find page: " + req.route.path);
                res.status(404);
                res.render('404', {title: '404: File Not Found'});
            })
            .all('/500', function (req, res, next) {
                next(new Error('keyboard cat!'));
            })
        ;
    }

    return route;
};
