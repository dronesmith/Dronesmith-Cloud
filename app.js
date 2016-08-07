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

// Node modules
var cluster = require('cluster'),
  path = require('path'),
  uuid = require('uuid');

// Express modules
var express = require('express'),
  compression = require('compression'),
  bodyParser = require('body-parser'),
  methodOverride = require('method-override'),
  expressValidator = require('express-validator'),
  cookieParser = require('cookie-parser'),
  favicon = require('serve-favicon'),
  session = require('express-session'),
  RedisStore = require('connect-redis')(session),
  lessMiddleware = require('less-middleware');

// Init internal modules
require('./lib/db');

var passport = require('./lib/passport')();

const KEEN_ENV = 'testing';
global.KEEN_ENV = KEEN_ENV;

// get root path
// FIXME
global.appRoot = path.resolve(__dirname);

// get basic properties and set logging.
var config = require('./config/config.js'),
  env = config.application.env || 'development',
  log = require('./lib/log.js').getLogger(__filename);

// Activity tracking
var KeenTracking = require('keen-tracking');

// Configure a client instance
var keenClient = new KeenTracking(config.keen);
global.KeenTracking = keenClient;

// Init
var app = express();

// set port and environment properties
app.set('port', config.application.port || 3000);
app.set('env', env);

// Init Session
var serveSession = session({
  genid: function(req) {
    return uuid.v4();
  },
  secret: 'CLx2wWpEJ94KV8Fw4ewVhRzU',
  resave: false,
  saveUninitialized: false,
  store: new RedisStore(config.session)
});

/**
 * Middlewares
 *
 * - Compression
 *   Will be used for tarballing apps/mods
 * - Body Parser
 *   Needed for parsing url-encodings and JSON responses
 * - Method Override
 *   For REST API implementations, this ensures that browser compatilbity.
 * - Express Validator
 *   Easier to parse query strings
 * - Cookie Parser
 *   For dealing with cookies, which are bound to arise
 * - Favicon
 *   The favicon...
 * - Session
 *   Session manager.
 * - Less Middleware
 *   Processes LESS to CSS on the fly to make our lives easier.
 */
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.raw({limit: '50mb'}));
app.use(methodOverride());
app.use(expressValidator());
app.use(cookieParser());
app.use(favicon(path.join(__dirname, 'forge-ux/public/assets/favicon.ico')));
app.use(serveSession);
app.use(passport.initialize());
app.use(passport.session());
// app.use(lessMiddleware(path.join(__dirname, 'forge-ux/public/theme'), {
// 	dest: path.join(__dirname, 'forge-ux/public'),
//   debug: false
// }));


// Check for session, later authorization
app.use(function (req, res, next) {
  if (!req.session) {
    return next(new Error('Session should never be null!\nIs Redis running?'));
  }
  next();
});

app.get('/', function(req, res, next) {
  keenClient.recordEvent('visitor', {
    env: KEEN_ENV,
    tracking: {
      path: req.path,
      ip: req.ip,
      method: req.method,
      url: req.url,
      host: req.hostname,
      referrer: req.headers.referrer,
      userAgent: req.headers['user-agent']
    }
  });
  next();
});

// Render statics (including HTML)
app.use(express.static(path.join(__dirname, 'forge-ux/public')));

// Some logging stuff.
app.use(function (req, res, next) {
    res.setHeader('x-powered-by', 'DronesmithTech');
    return next();
});

app.use(function (req, res, next) {
  log.debug('[REQUEST]', req.ip, req.method, req.url);
  next();
});


// Init the router
var Router = express.Router();
var router = require('./routes/index')(app, Router);

// validate api keys
app.use('/api/', function(req, res, next) {

  if (req.headers['user-email'] && req.headers['user-key']) {
    var User = require('mongoose').model('User');

    User
      .findOne({email: req.headers['user-email']})
      .select({apiKey: 1, apiCnt: 1})
      .exec(function(err, key) {
        if (err || !key) {
          return res.status(401).send();
        } else {
          if (req.headers['user-key'] !== key.apiKey) {
            return res.status(401).send();
          } else {
            key.apiCnt++;

            User.find({}).count().exec(function(err, counter) {
              if (err != null) {
                counter = 0;
              }

              keenClient.recordEvent('api', {
                env: KEEN_ENV,
                email: req.headers['user-email'],
                apiCnt: key.apiCnt,
                path: req.path,
                ip: req.ip,
                method: req.method,
                url: req.url,
                cnt: counter
              });

              key.save(function() { next(); });
            });
          }
        }
      });
  } else {
    return res.header('WWW-Authenticate', 'Basic realm="Dronesmith Cloud"').status(401).send();
  }
});

// app.use('/api/drone/', function(req, res, next) {
//   if (req.path == '/api/drone' && req.method == 'POST') {
//     next();
//   } else {
//     var User = require('mongoose').model('User');
//     var _ = require('underscore');
//
//     if (!req.params._id) {
//       return next(); // we'll get all drones the user has.
//     }
//
//     User
//       .findOne({email: req.headers['user-email']})
//       .select({drones: 1})
//       .exec(function(err, user) {
//         user.drones.indexOf(req.params._id);
//         console.log('finding ', user.drones.indexOf(req.params._id));
//         return next();
//       })
//     ;
//   }
// });

// validate admin
app.use('/admin/', function(req, res, next) {
  keenClient.recordEvent('admin', {
    env: KEEN_ENV,
    tracking: {
      path: req.path,
      ip: req.ip,
      method: req.method,
      url: req.url,
      host: req.hostname,
      referrer: req.headers.referrer,
      userAgent: req.headers['user-agent']
    }
  });
  if (req.headers['admin-key'] && req.headers['admin-key'] === config.adminKey) {
    next();
  } else {
    return res.header('WWW-Authenticate', 'Basic realm="Dronesmith Cloud"').status(401).send();
  }
});

app.use('/rt/', function(req, res, next) {
  // TODO check on session route.
  keenClient.recordEvent('flightsync', {
    env: KEEN_ENV,
    tracking: {
      path: req.path,
      ip: req.ip,
      method: req.method,
      url: req.url,
      host: req.hostname,
      referrer: req.headers.referrer,
      userAgent: req.headers['user-agent']
    }
  });
  next();
});

// Index routes should always have a session.
app.use('/index/', function(req, res, next) {

  // ...with the exception of /session/ which handles this itself.
  if (req.path == '/session' || req.path == '/user/forgotPassword') {
    next();
  } else if (req.path == '/user' && req.method == 'POST') {
    next(); // open up registration
    // res.status(400).json({error: "Sorry, Forge Cloud is currently invite only."});
  } else if (!req.session.userData) {
    res.status(400).json({error: "Not logged in."});
  } else {
    keenClient.recordEvent('client', {
      env: KEEN_ENV,
      tracking: {
        path: req.path,
        ip: req.ip,
        method: req.method,
        url: req.url,
        host: req.hostname,
        referrer: req.headers.referrer,
        userAgent: req.headers['user-agent']
      }
    });
    next();
  }
});

app.use('/', router);

// Handle 404s
app.use(function (req, res) {
    log.warn("Can not find page: " +  req.originalUrl);
    res.status(404);
    res.sendFile(path.join(__dirname, '/forge-ux/public', '404.html'));
});
// Handle 500s
app.use(function (error, req, res, next) {
    log.error(error);
    res
      .status(500)
      .send(error.stack); // rendering this via angular
});

app.locals.pretty = true;

// These middlewares should only be loaded in non-prod envs.
// FIXME - library is crashing.
// if (app.get('env') === 'development') {
//   var errorHandler = require('error-handler');
//   app.use(errorHandler({ dumpExceptions: true, showStack: true }));
// }

if (cluster.isMaster
    && (app.get('env') !== 'development')
    && (process.argv.indexOf('--singleProcess') < 0)) {

    var emoji = require('node-emoji');

    log.info(emoji.emojify(':tada:  Welcome to Dronesmith Cloud! :tada:'));

    log.info(emoji.emojify(':beer:  Created by Dronesmith Technologies.'));

    log.info('\n\n\nCopyright (C) 2016 Dronesmith Technologies Inc, all rights reserved. '
      + '\nUnauthorized copying of any source code or assets within this project, via any medium is strictly prohibited.'
      + '\nProprietary and confidential.\n\n');

    var cpuCount = require('os').cpus().length;

    log.info('[MASTER] Deploying cluster across', cpuCount, 'logical cores.' );

    for (var i = 0; i < cpuCount; ++i) {
      cluster.fork();
    }

    cluster.on('exit', function(worker) {
      log.warn('[MASTER] Worker', worker.id, 'died.');
      cluster.fork();
    });
} else {
  var server = app.listen(app.get('port'), function () {

    var host = server.address().address;
    var port = server.address().port;

    log.info('[WORKER] Server listening on', app.get('port'));
    log.info('[WORKER] Running in', app.get('env').toUpperCase(), 'mode');
  });

  log.info('[WORKER] Initializing Dronelink');
  require('./lib/datalinks/dronelink').Singleton();

  log.info('[WORKER] Initializing SITL');
  require('./lib/datalinks/sitllink').Singleton();

  log.info('[WORKER] Deploying Client RT');
  require('./lib/datalinks/clientlink')(server, serveSession);

  // Luci Cam Launch promo
  log.info('[WORKER] Deploying LUCICAM app');
  require('./lib/lucicam');
}
