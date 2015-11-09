'use strict';

// init DB connection
var
  config = require('../config/config'),
  mongoose = require('mongoose'),
  fs = require('fs'),
  async = require('async'),
  mandrill = require('mandrill-api'),
  mandrill_client = new mandrill.Mandrill('afbvO4sjVBbbBJuuqDRn0A');
;

var uri = 'mongodb://';
if (config.db.user !== '') {
    uri += config.db.user + ':' + config.db.pass + "@";
}

mongoose.connect('mongodb://localhost/' + config.db.name, config.db.options);

mongoose.connection.on('error', function(err) {
    console.log('DB Connection error: ' + err);
});

mongoose.connection.on('connected', function() {
  // register model objects
  var modelsDir = '../lib/models';
  fs.readdirSync(modelsDir).forEach(function (file) {
      if (/\.js$/.test(file)) {
          // log.debug('requiring model file: ' + file);
          require(modelsDir + '/' + file);
      }
  });

  var
    path = require('path'),
    User = mongoose.model('User'),
    uuid = require('uuid'),
    utils = require('../lib/utils.js'),

    DRONE_MONGO_ID = "5637f2451cf63be64145366c"
  ;

  if (process.argv.length < 3) {
    console.log("initapi - Adds API keys, creates user accounts, and sends an email.");
    console.log("\t--list\tA JSON list of emails to begin the process.");
    console.log("\t--id\t An id of the default drone to add for each user.");
    console.log("\t--update\t Indicate the models should be updated, not removed.");
  } else {
    var listfile = '', id = DRONE_MONGO_ID, isUpdate = false;

    for (var k in process.argv) {
      var arg = process.argv[k];

      switch (arg) {
        case '--list':
          listfile = path.resolve(process.argv[+k+1]) || null;
          break;
        case '--id':
          id = process.argv[+k+1] || DRONE_MONGO_ID;
          break;
        case '--update':
          isUpdate = true;
          break;
      }
    }

    try {
      var emails = JSON.parse(fs.readFileSync(listfile));
    } catch (e) {
      console.log(e);
      process.exit(1);
    }

    async.each(emails, function(email, cb) {
      var
        newPassword = Array(10).join((Math.random().toString(36)+'00000000000000000').slice(2, 18)).slice(0, 9),
        callbackList = [],
        user
      ;

      if (!isUpdate) {
        callbackList.push(
          function(cb) {
            user = new User({
              email:                  email.email,
              password:               newPassword,
              confirmPassword:        newPassword,
              fullName:               email.name,
              company:                email.company,
              kind:                   "other",
              Otherkind:              "elevated",
              apiKey:                 uuid.v4(),
              drones:                 [ utils.castDocumentId(id) ]
            });

            cb (null, user);
          }
        );
      } else {
        callbackList.push(
          function(cb) {
            User
              .findOne({email: email.email})
              .exec(function(err, user) {
                return cb(err, user);
              })
            ;
          }
        );
      }

      callbackList.push(function(user, cb) {
        user.setPassword(newPassword);
        user.fullName = email.name;
        user.company = email.company;
        user.apiKey = uuid.v4();
        user.drones =  [ utils.castDocumentId(id) ];

        // tracking info
        user.ipAddr = "lo";
        user.referringUrl = null;
        user.userAgent = "LFS";
        user.onWaitList = false;
        user.isVerified = true;
        user.save(function(err) { cb(err, user); });
      });

      callbackList.push(function(user, cb) {
        var message = {
          html:     "<h2>Welcome to the next generation of Development.</h2>"
                          + "<p>We really appreciate you checking out our Early Access, and we hope you'll enjoy using Forge.</p>\n"
                          + "<p>Below is your login credentials and developer API key. It is advised you change your password"
                          + " once logged in.</p>\n\n"
                          + "<p>Email: <strong>" + user.email + "</strong></p>"
                          + "<p>Password: <strong>" + newPassword + "</strong></p>"
                          + "<p>API Key: <strong>" + user.apiKey + "</strong></p>",
          subject:  "Your Forge Cloud Access Information",
          from_email:     "hello@dronesmith.io",
          to:       [{
                      "email": user.email,
                      "name" : user.fullName,
                      "type" : "to"
                    }]
        }
        
        mandrill_client.messages.send({"message": message, "async": true},
          function(result) {
            console.log(result);
          }, function(err) {
            console.log('A mandrill error: ' + err.name + ' - ' + err.message);
          });
      });

      async.waterfall(callbackList, function(err, result) {
        cb(err, result);
      });

    }, function(err, result) {
      if (err) {
        console.log(err);
      }

      mongoose.connection.close(function () {
          console.log('DB connection terminated.');
          process.exit(0);
      });
    });

  }
});

process.on('SIGINT', function() {
    mongoose.connection.close(function () {
        console.log('DB connection terminated.');
        process.exit(0);
    });
});
