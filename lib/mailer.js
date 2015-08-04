'use strict';

var config = require('../config/config'),
	  nodemailer = require('nodemailer'),

		MAILER_SENDER = 'geoff@skyworksas.com',
    SITE_NAME = 'stage.dronesmith.io',

		ACCESS_STRING = "<p>We really appreciate you checking out our Early Access, and we just know you'll love Forge.\n"
									+ "We're interested to hear what you have to say, so please reply to this email and let me know what you think!</p>\n"
									+ "<p>Oh yea, here's your access code. Just click the following link and your account will be activated!</p>\n\n",

		WAITLIST_STRING = "<p>We really appreciate you checking out our Early Access, and we just know you'll love Forge.\n"
										+ "Oh noes! It looks like the early access is at capacity. Sorry! You've been put on our waitlist,"
										+ "and we'll be sure to email you on any updates, especially if we open up another early access period!</p>"
		;

var mailer = function() {

  return {
    sendWelcome: function(user) {

			var access_code = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
						+ "<a href=\"http://" + SITE_NAME + '/' + user._id + "\">" + SITE_NAME + '/' + user._id + "</a>\n\n"

			var title = user.onWaitList ? "Thanks for signing up!"
				: "You're in! Welcome to Forge!";

			// NOTE These cannot be defined inline the string, because javascript as a
			// programming language is fundamentally disabled.
			var cond1 = user.onWaitList ? WAITLIST_STRING : ACCESS_STRING;
			var cond2 = user.onWaitList ? '' : access_code;

			var str = "<h2>Hullo!</h2>\n\n"
							+ cond1
							+ cond2
							+ "<br><br>"
			        + "<address>Thanks,<br><br>"
			        + "&nbsp;&nbsp;Geoff<br>\n"
			        + "&nbsp;&nbsp;Chief Software Dude<br>\n"
			        + "&nbsp;&nbsp;Skyworks Aerial Systems\n</address>";

      nodemailer.createTransport().sendMail({
        from: MAILER_SENDER,
        to: user.email,
        subject: title,
        html: str
      })
      ;
    },

		resetPassword: function(resetEmail, newPassword) {
			var str = "<h2>Hi!</h2>\n\n"
							+ "<p>Here is your new password</p>"
							+ newPassword;
			nodemailer.createTransport().sendMail({
				from: MAILER_SENDER,
				to: resetEmail,
				subject: "Hurro!",
				html: str
			})
			;
		}
  };
};


exports = module.exports = mailer;
