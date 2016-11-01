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
var
  fs = require('fs'),
  http = require('http'),
  https = require('https'),
  cluster = require('cluster'),
  path = require('path'),
  uuid = require('uuid');

// Express modules
var express = require('express'),
  compression = require('compression'),
  bodyParser = require('body-parser'),
  methodOverride = require('method-override'),
  expressValidator = require('express-validator'),
  api = require('./lib/api');

// Init internal modules
require('./lib/db');

const KEEN_ENV = 'testing';
global.KEEN_ENV = KEEN_ENV;

// get root path
// FIXME
global.appRoot = path.resolve(__dirname);

// get basic properties and set logging.
var config = require('./config/config.js'),
  env = config.application.env || 'development',
  log = require('./lib/log.js').getLogger(__filename);

if (config.ssl.use) {
  var creds = {
    key: fs.readFileSync(config.ssl.path + 'privkey.pem'),
    cert: fs.readFileSync(config.ssl.path + 'fullchain.pem'),
    ca: fs.readFileSync(config.ssl.path + 'chain.pem')
  };
}

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
 */
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.raw({limit: '50mb'}));
app.use(methodOverride());
app.use(expressValidator());

// Handle AJAX requests
app.use(function(req, res, next) {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, user-key, user-email");

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
      res.send(200);
    } else {
      next();
    }
});

app.get('/', function(req, res, next) {
  // keenClient.recordEvent('visitor', {
  //   env: KEEN_ENV,
  //   tracking: {
  //     path: req.path,
  //     ip: req.ip,
  //     method: req.method,
  //     url: req.url,
  //     host: req.hostname,
  //     referrer: req.headers['referer'],
  //     userAgent: req.headers['user-agent']
  //   }
  // });

  res.send('Dronesmith Cloud Service');
});

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
          return res.status(403).send();
        } else {
          if (req.headers['user-key'] !== key.apiKey) {
            return res.status(403).send();
          } else {
            key.apiCnt++;

            // User.find({}).count().exec(function(err, counter) {
            //   if (err != null) {
            //     counter = 0;
            //   }

              keenClient.recordEvent('api', {
                env: KEEN_ENV,
                email: req.headers['user-email'],
                apiCnt: key.apiCnt,
                path: req.path,
                ip: req.ip,
                method: req.method,
                url: req.url
              });

              key.save(function() { next(); });
            // });
          }
        }
      });
  } else {
    return res.status(403).send();
  }
});

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
    return res.status(403).send();
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
app.use('/index/user', function(req, res, next) {
  keenClient.recordEvent('client', {
    env: KEEN_ENV,
    tracking: {
      user: req.params.id,
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

app.use('/', router);

app.get('/api/drones', function(req, res, next) {
  api.Request(req, '/drones', function(response, err) {
    if (err) {
      return next(err);
    } else {
      if (response.status == 200 || response.status == 400) {
        return res.status(response.status).json(response.chunk);
      } else {
        return res.status(response.status).send(response.chunk);
      }
    }
  });
});

app.all('/api/drone/*', function(req, res, next) {
  var strs = req.url.split('/');
  if (strs[1] == 'api') {
    var newstr = "";
    for (var i = 2; i < strs.length; ++i) {
      newstr += '/' + strs[i];
    }

    api.Request(req, newstr, function(response, err) {
      if (err) {
        return next(err);
      } else {
        if (response.status == 200 || response.status == 400) {
          return res.status(response.status).json(response.chunk);
        } else {
          return res.status(response.status).send(response.chunk);
        }
      }
    });
  } else {
    next();
  }
});

// Handle 404s
app.use(function (req, res) {
    log.warn("Can not find page: " +  req.originalUrl);
    res.status(404);
    res.send();
});
// Handle 500s
app.use(function (error, req, res, next) {
    log.error(error);
    res
      .status(500)
      .send(error.stack); // rendering this via angular
});

app.locals.pretty = true;

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

    // log.info('[MASTER] Deploying Promotional Lucicam');
    // require('./lib/lucicam');

    log.info('[MASTER] Deploying cluster across', cpuCount, 'logical cores.' );

    for (var i = 0; i < cpuCount; ++i) {
      cluster.fork();
    }

    cluster.on('exit', function(worker) {
      log.warn('[MASTER] Worker', worker.id, 'died.');
      cluster.fork();
    });
} else {
  if (config.ssl.use) {
    var server = https.createServer(creds, app);
    server.listen(app.get('port'), function () {
      // HTTP forwarding
      http.createServer(function (req, res) {
        res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
        res.end();
      }).listen(80);

      var host = server.address().address;
      var port = server.address().port;

      log.info('[WORKER] Server listening on', app.get('port'));
      log.info('[WORKER] Running in', app.get('env').toUpperCase(), 'mode');
    });
  } else {
    var server = http.createServer(app);
    server.listen(app.get('port'), function () {
      var host = server.address().address;
      var port = server.address().port;

      log.info('[WORKER] Server listening on', app.get('port'));
      log.info('[WORKER] Running in', app.get('env').toUpperCase(), 'mode');
    });
  }
}
