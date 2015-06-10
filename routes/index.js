'use strict';

var passport = require('passport'),
  user = require('../lib/controllers/user'),
  session = require('../lib/controllers/session');

module.exports = function(app, route) {
    // catchall route
    route
        .all('*', function (request, response, next) {
            // placeholder for catching each request
            next();
        })

        // User creation
        .post('/api/user', user.create)

        // Authenticate a session (allows logins)
        .post('/api/session', session.authenticate)

        // See if user still has a running session
        .get('/api/session', session.poll)
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
