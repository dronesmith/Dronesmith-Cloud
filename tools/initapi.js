'use strict';

// init DB connection
var
  config = require('../config/config'),
  mongoose = require('mongoose'),
  fs = require('fs')
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
  var
    path = require('path'),
    User = mongoose.model('User'),
    uuid = require('uuid'),
    nodemailer = require('nodemailer'),
    utils = require('../lib/utils.js'),

    DRONE_MONGO_ID = "5637f2451cf63be64145366c"
  ;

  if (process.argv.length < 3) {
    console.log("initapi - Adds API keys, creates user accounts, and sends an email.");
    console.log("\t--list\tA JSON list of emails to begin the process.");
    console.log("\t--id\t An id of the default drone to add for each user.");
  } else {
    var listfile = '', id = DRONE_MONGO_ID;

    for (var k in process.argv) {
      var arg = process.argv[k];

      switch (arg) {
        case '--list':
          listfile = path.resolve(process.argv[+k+1]) || null;
          break;
        case '--id':
          id = process.argv[+k+1] || DRONE_MONGO_ID;
          break;
      }
    }

    try {
      var emails = JSON.parse(fs.readFileSync(listfile));
    } catch (e) {
      console.log(e);
      process.exit(1);
    }

    for (var i = 0; i < emails.length; ++i) {
      var newPassword = Array(10).join((Math.random().toString(36)+'00000000000000000').slice(2, 18)).slice(0, 9);
      var user = new User({
        email:                  emails[i].email,
        password:               newPassword,
        confirmPassword:        newPassword,
        fullName:               emails[i].name,
        company:                emails[i].company,
        kind:                   "other",
        Otherkind:              "elevated",
        apiKey:                 uuid.v4(),
        drones:                 [ utils.castDocumentId(id) ]
      });

      user.setPassword(newPassword);

      // tracking info
      user.ipAddr = "lo";
      user.referringUrl = null;
      user.userAgent = "LFS";
      user.onWaitList = false;
      user.isVerified = true;

      user.save(function(err) {
        if (err) {
          console.log(err);  
        }
      });
      nodemailer.createTransport().sendMail({
        from:     "hello@dronesmith.io",
        to:       user.email,
        subject:  "Your Forge Cloud Access Information",
        html:     "<h2>Welcome to the next generation of Development.</h2>"
                        + "<p>We really appreciate you checking out our Early Access, and we hope you'll enjoy using Forge.</p>\n"
                        + "<p>Below is your login credentials and developer API key. It is advised you change your password"
                        + " once logged in.</p>\n\n"
                        + "<p>Email: <strong>" + user.email + "</strong></p>"
                        + "<p>Password: <strong>" + newPassword + "</strong></p>"
                        + "<p>API Key: <strong>" + user.apiKey + "</strong></p>",
      })
      ;
    }
  }

  // mongoose.connection.close(function () {
  //     console.log('DB connection terminated.');
  //     process.exit(0);
  // });
});

process.on('SIGINT', function() {
    mongoose.connection.close(function () {
        console.log('DB connection terminated.');
        process.exit(0);
    });
});

// register model objects
var modelsDir = '../lib/models';
fs.readdirSync(modelsDir).forEach(function (file) {
    if (/\.js$/.test(file)) {
        // log.debug('requiring model file: ' + file);
        require(modelsDir + '/' + file);
    }
});
