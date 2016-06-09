# Dronesmith Cloud

# Technologies
Dronesmith Cloud is entirely MEAN stack, and as such is powered by the following technologies:

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
- ThreeJS
- Grunt
- SocketIO
- Gateone

## Tech changes
I plan to move from MongoDB to Couchbase, and potentially socket.io to something else
as well. Upgrading to Angular 2 and Material Design for our UX is also on the discussion
table. Do not expect this tech stack to be stagnet as things change.

# Running

	git submodule update --init
	npm install
	cd forge-ux/
	bower install
	cd ..
	node app.js


The `Grunt` taskloader is currently broken.

Runtime configuration settings can be edited in the `properties.json` file. In addition, `properies.[environment].json` allows you to create multiple configs per environment (for example, `properties.development.json`).

For development environemnts, to view your app, navigate to `localhost:4000` by default.

For everything to work right, you will need to have the mongo daemon (`mongod`) and redis (`redis-server`) running, along with nodejs installed.

We also employ `Gateone` for our remote terminal features, so you'll need that too.

# Forge UX

The frontend portion of the projct has been divided into its own repo. Work currently needs to be done handle things like LESS proprocessing and other features of the frontend.

# Contributing

Contributing is pretty standard. See the Airtable for things to work on and bugs to fix.

<!--1. Assigned yourself an unassigned **FORG** ticket in Jira.
2. git branch FORG-[ticketnumber] (eg, FORG-45)-->
3. Implement your work on a development branch.
4. Make a pull request to master when you are ready
5. Geoff will do a code review of this pull req, and if everything looks good, will give the thumbs up and merge it.

The code is not very well documented, and not nearly as clean as I'd like it to be, so feel free to ask questions if you noticed something weird.


# Ideas

Ideas, brainstorming, and out-of-the-box thinking are encouraged! Please ping Geoff and/or Greg on Slack to bounce ideas around, or post it in the `#dss-dev` channel on Slack.
