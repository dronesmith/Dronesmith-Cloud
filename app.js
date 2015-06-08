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
  lessMiddleware = require('less-middleware');

// Init internal modules
require('./lib/passport');

// get basic properties and set logging.
var env = process.env.NODE_ENV || 'development',
	config = require('./config/config.js'),
  log = require('./lib/log.js').getLogger(__filename);

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
app.use(methodOverride());
app.use(expressValidator());
app.use(cookieParser());
app.use(favicon(path.join(__dirname, 'public/img/favicon.ico')));
app.use(session({
  genid: function(req) {
    return uuid.v4();
  },
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false
}));
app.use(lessMiddleware(path.join(__dirname, 'theme'), {
	dest: path.join(__dirname, 'public'),
  debug: true
}));


// Render statics (including HTML)
app.use(express.static(path.join(__dirname, 'public')));

// Init the router
var Router = express.Router();
var router = require('./routes/index')(app, Router);

app.use('/', router);

app.use(function (req, res, next) {
    res.setHeader('x-powered-by', 'drones, lots of drones');
    return next();
});

app.use(function (req, res, next) {
    log.debug('[REQUEST]', req.method, req.url);
    next();
});

// Handle 404s
app.use(function (req, res) {
    log.warn("Can not find page: " +  req.originalUrl);
    res.status(404);
    res.sendFile(path.join(__dirname, '/public', '404.html'));
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
if (app.get('env').NODE_ENV ==='development') {
  errorHandler = require('error-handler');
  app.use(errorHandler({ dumpExceptions: true, showStack: true }));
}

if (cluster.isMaster
    && (app.get('env') !== 'development')
    && (process.argv.indexOf('--singleProcess') < 0)) {

    log.warn('Running in prod, deploying cluster');

    var cpuCount = require('os').cpus().length;

    for (var i = 0; i < cpuCount; ++i) {
      log.info('Forking', i);
      cluster.fork();
    }

    cluster.on('exit', function(worker) {
      log.warn('WARNING: Worker', worker.id, 'died.');
      cluster.fork();
    });
} else {
  var server = app.listen(app.get('port'), function () {

    var host = server.address().address;
    var port = server.address().port;

    log.info('Server listening on', app.get('port'));
    log.info('Running in', app.get('env').toUpperCase(), 'mode');
  });

}
