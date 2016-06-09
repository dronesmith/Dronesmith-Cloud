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

var config = require('../config/config'),
	  nodemailer = require('nodemailer'),

		MAILER_SENDER = 'hello@dronesmith.io',
    SITE_NAME = 'cloud.dronesmith.io',

		ACCESS_STRING = "<p>We really appreciate you checking out our early access, and we just know you'll love Dronesmith Cloud.\n"
									+ "We're interested to hear what you have to say, so please reply to this email and let me know what you think!</p>\n"
									+ "<p>Oh yea, here's your access code. Just click the following link and your account will be activated!</p>\n\n",

		WAITLIST_STRING = "<p>We really appreciate you checking out our early access, and we just know you'll love Dronesmith Cloud.\n"
										+ "Oh noes! It looks like the early access is at capacity. Sorry! You've been put on our waitlist,"
										+ "and we'll be sure to email you on any updates, especially if we open up another early access period!</p>"
		;

var mailer = function() {

  return {
    sendWelcome: function(user) {

			var access_code = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
						+ "<a href=\"http://" + SITE_NAME + '/' + user._id + "\">" + SITE_NAME + '/' + user._id + "</a>\n\n"

		  var apiKey = "Your API key is: <strong>" + user.apiKey + "</strong><br>Remember this! You will need it to access the API.";

			var title = user.onWaitList ? "Thanks for signing up!"
				: "Welcome to Dronesmith Cloud!";

			// NOTE These cannot be defined inline the string
			var cond1 = user.onWaitList ? WAITLIST_STRING : ACCESS_STRING;
			var cond2 = user.onWaitList ? '' : access_code;

			var str = "<h2>Welcome to Dronesmith Cloud!</h2>\n\n"
							+ cond1
							+ cond2
							+ "<br><br>"
							+ apiKey
							+ "<br>"
							+ "You can find the API documentation <a href=\"https://dronesmith.readme.io/docs\">here</a>."
							+ "<br><br>"
			        + "<address>Thanks,<br><br>"
			        + "&nbsp;&nbsp;Geoff<br>\n"
			        + "&nbsp;&nbsp;Software Architect<br>\n"
			        + "&nbsp;&nbsp;Dronesmith Technologies\n</address>";

			nodemailer.createTransport().sendMail({
				from: MAILER_SENDER,
				to: user.email,
				subject: title,
				html: str
			})
			;
    },

		resetPassword: function(resetEmail, newPassword) {
			var str = "<h3><em>Hey, listen!</em></h3>\n\n"
							+ "<p>You or someone using your account requested a new password. Use the below password to log in. It's recommended you change your password once logged in.</p>"
							+ "<p>If this was <strong>not</strong> submitted by you, do not use this password, and please <a href=\"mailto:support@skyworksas.com\">contact us</a>.</p>"
							+ "<p>Your new password: <strong>" + newPassword + "</strong></p>";

			nodemailer.createTransport().sendMail({
				from: MAILER_SENDER,
				to: resetEmail,
				subject: "Dronesmith Cloud: Password Reset",
				html: str
			})
			;

		}
  };
};


exports = module.exports = mailer;
