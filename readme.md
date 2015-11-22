# Forge Core

## Read this
https://docs.google.com/a/skyworksas.com/document/d/1MBC_XJI4MBlnFKsf7wPOWXr3pZnDD3V4Lx3Z4hY_baA/edit?usp=sharing

#Technologies
Forge is entirely MEAN stack, and as such is powered by the following technologies:

- Nodejs
- Express
- MongoDB
- AngularJS

In addition, it also uses the following:

- Bootstrap
- JQuery
- LESS
- Mongoose
- Redis
- PassportJS
- Angular UI

# Running

	npm install
	grunt serve

Optionally, you can directly invoke the app with the following:

	node app.js

Runtime configuration settings can be edited in the `properties.json` file. In addition, `properies.[environment].json` allows you to create multiple configs per environment (for example, `properties.development.json`).

For development environemnts, to view your app, navigate to `localhost:3000` by default.

For everything to work right, you will need to have the mongo daemon (`mongod`) and redis (`redis-server`) running, along with nodejs installed.

# Contributing

Please read the architecture section before contributing!

Contributing is simple.

1. Assigned yourself an unassigned **FORG** ticket in Jira.
2. git branch FORG-[ticketnumber] (eg, FORG-45)
3. Implement your work on this branch.
4. Make a pull request to master when you are ready
5. Geoff will do a code review of this pull req, and if everything looks good, will give the thumbs up and merge it.

Please note that inactive branches will be purged from the remote on a bi-weekly basis.
