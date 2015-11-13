'use strict';

var config = require('../config/config'),
	  mandrill = require('mandrill-api/mandrill'),
	  mandrill_client = new mandrill.Mandrill(config.mailer),

		MAILER_SENDER = 'hello@dronesmith.io',
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

			var str = "<h2>Welcome to Forge Cloud!</h2>\n\n"
							+ cond1
							+ cond2
							+ "<br><br>"
			        + "<address>Thanks,<br><br>"
			        + "&nbsp;&nbsp;Geoff<br>\n"
			        + "&nbsp;&nbsp;Chief Software Dude<br>\n"
			        + "&nbsp;&nbsp;Skyworks Aerial Systems\n</address>";

			var message = {
				html: str,
				subject: title,
				from_email: MAILER_SENDER,
				to: [{
					"email": user.email,
					"name": user.fullName,
					"type": "to"
				}]
			}

			mandrill_client.messages.send({"message": message, "async": true},
				function(result) {
					console.log(result);
				}, function(err) {
					console.log('A mandrill error: ' + err.name + ' - ' + err.message);
				});
    },

		resetPassword: function(resetEmail, newPassword) {
			var str = "<h3><em>Hey, listen!</em></h3>\n\n"
							+ "<p>You or someone using your account requested a new password. Use the below password to log in. It's recommended you change your password once logged in.</p>"
							+ "<p>If this was <strong>not</strong> submitted by you, do not use this password, and please <a href=\"mailto:support@skyworksas.com\">contact us</a>.</p>"
							+ "<p>Your new password: <strong>" + newPassword + "</strong></p>";

			var message = {
				html: str,
				subject: "Forge Cloud Password Reset",
				from_email: MAILER_SENDER,
				to: [{
					"email": resetEmail,
					"type": "to"
				}]
			}

			mandrill_client.messages.send({"message": message, "async": true},
				function(result) {
					// console.log(result);
				}, function(err) {
					console.log('A mandrill error: ' + err.name + ' - ' + err.message);
				});
		}
  };
};


exports = module.exports = mailer;
