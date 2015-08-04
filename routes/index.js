'use strict';

var passport = require('passport'),
  user = require('../lib/controllers/user'),
  session = require('../lib/controllers/session'),
  mongoose = require('mongoose'),
  User = mongoose.model('User'),
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

        // User creation
       .post('/api/user', user.create)

        //Send new password
       .put('/api/user', user.forgotPassword)

        // Add event when user clicks something
        .put('/api/user', user.update)

        // Authenticate a session (allows logins)
        .post('/api/session', session.authenticate)

        //Check if email exists, if it does send reset password link
        // .get('/api/user?userId=<mongo id>', user.checkEmail)

        // See if user still has a running session
        .get('/api/session', session.poll)

        .put('/api/session', session.sync)

        .get('/api/cloudbit', cloudbit.get)
        .post('/api/cloudbit', cloudbit.output)

        .get('/:type([A-Z|a-z|0-9]{24})', user.confirm);

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
