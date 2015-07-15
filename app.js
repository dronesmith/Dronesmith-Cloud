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

// get root path
global.appRoot = path.resolve(__dirname);

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
  secret: 'tit-a-lee-tit-a-loo',
  resave: false,
  saveUninitialized: false,
  store: new RedisStore(config.session)
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(lessMiddleware(path.join(__dirname, 'theme'), {
	dest: path.join(__dirname, 'public'),
  debug: false
}));

var ig = require('instagram-node').instagram();

/*

OBTAINING AN ACCESS TOKEN

(Note that they expire after a few days)

1. Navigate to this URL:
https://api.instagram.com/oauth/authorize/?client_id=5a013ce9cb2e4803b7611fe9da07409a&redirect_uri=http://stage.dronesmith.io&response_type=code&scope=likes+comments

2. Take the code that was received and put it into this curl:
(5bdbd1e452934a7ba9c4bfb7c75f2900)

curl -F 'client_id=5a013ce9cb2e4803b7611fe9da07409a' \
  -F 'client_secret=58d6f073de8e4219b97fa00a7299703d' \
  -F 'grant_type=authorization_code' \
  -F 'redirect_uri=http://stage.dronesmith.io' \
  -F 'code=5bdbd1e452934a7ba9c4bfb7c75f2900' \
  https://api.instagram.com/oauth/access_token

3. You now have the access token.

*/

// Every call to `ig.use()` overrides the `client_id/client_secret`
// or `access_token` previously entered if they exist.
//
//5a013ce9cb2e4803b7611fe9da07409a
//CLIENT SECRET	58d6f073de8e4219b97fa00a7299703d
//
ig.use({ access_token: '1913424739.5a013ce.37962c6c31cd41e7985bda124536041d' });
ig.use({ client_id: '5a013ce9cb2e4803b7611fe9da07409a',
         client_secret: '58d6f073de8e4219b97fa00a7299703d' });

/*
curl -F 'client_id=5a013ce9cb2e4803b7611fe9da07409a' \
  -F 'client_secret=58d6f073de8e4219b97fa00a7299703d' \
  -F 'grant_type=authorization_code' \
  -F 'redirect_uri=http://stage.dronesmith.io' \
  -F 'code=9d7c92bbbfcc4630ad909ac92cc91316' \
  https://api.instagram.com/oauth/access_token
*/

/*
curl -F 'client_id=5a013ce9cb2e4803b7611fe9da07409a' \
     -F 'client_secret=58d6f073de8e4219b97fa00a7299703d' \
     -F 'object=tag' \
     -F 'aspect=media' \
     -F 'object_id=nofilter' \
     -F 'callback_url=localhost/tags/droneparty' \
     https://api.instagram.com/v1/subscriptions/
*/

// ig.add_tag_subscription('droneparty', 'http://stage.dronesmith.io/', function(err, result, remaining, limit){
//   console.log(err);
//   console.log(result);
// });


// Check for session, later authorization
app.use(function (req, res, next) {
  if (!req.session) {
    return next(new Error('Session should never be null!\nIs Redis running?'));
  }
  next();
});

// Render statics (including HTML)
app.use(express.static(path.join(__dirname, 'public')));

// Some logging stuff.
app.use(function (req, res, next) {
    res.setHeader('x-powered-by', 'SkyworksAS');
    return next();
});

app.use(function (req, res, next) {
    log.debug('[REQUEST]', req.method, req.url);
    next();
});


// Init the router
var Router = express.Router();
var router = require('./routes/index')(app, Router);

var mediaData ;

/*
curl -F 'access_token=1913424739.5a013ce.37962c6c31cd41e7985bda124536041d' \
    -F 'text=This+is+my+comment' \
    https://api.instagram.com/v1/media/1023274892831363799_1913424739/comments
*/

app.get('/tags/:name', function(req, res) {
  ig.tag_media_recent(req.params.name, function(err, medias, pagination, remaining, limit) {
    mediaData = medias;

    ig.add_comment(mediaData[0].id, 'Awesome pic, ' + mediaData[0].user.username + '!',
      function(err, result, remaining, limit) {
        res
          .status(200)
          .json({result: err || result});
    });
  });


});

app.use('/', router);

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
