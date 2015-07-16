'use strict';

var config = require('../config/config'),
	  nodemailer = require('nodemailer'),
    MAILER_SENDER = 'geoff@skyworksas.com',
    SITE_NAME = 'localhost:4000';

var mailer = function() {

  return {
    sendWelcome: function(user) {
      nodemailer.createTransport().sendMail({
        from: MAILER_SENDER,
        to: user.email,
        subject: "You're in! Welcome to Forge!",
        html: "<h2>Hullo!</h2>\n\n"
          + "<p>We really appreciate you checking out our Early Access, and we just know you'll love Forge.\n"
          + "We're interested to hear what you have to say, so please reply to this email and let us know what you think!</p>\n"
          + "<p>Oh yea, here's your access code. Just click the following link and your account will be activated!</p>\n\n"
          + "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + "<a href=\"http://" + SITE_NAME + '/' + user._id + "\">" + SITE_NAME + '/' + user._id + "</a>\n\n"
          + "<br><br>"
          + "<address>Thanks,<br><br>"
          + "&nbsp;&nbsp;Geoff<br>\n"
          + "&nbsp;&nbsp;Chief Software Person<br>\n"
          + "&nbsp;&nbsp;Skyworks Aerial Systems\n</address>"
      })
      ;
    }
  };
};


exports = module.exports = mailer;
