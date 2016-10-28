# Dronesmith Cloud

# Node compatibility
Currently the cloud is running on Node v5 on the production server, and has been tested properly up to Node v7, however there are some deprecation warnings, namely using new Buffer instead of Buffer.alloc or Buffer.from, Mongoose Promise is also deprecated. These will need to be removed as we upgrade on Node, but there is no immediate need for this.

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
Simply use the install script:

	./install.sh
	node app.js


The `Grunt` taskloader is currently broken.

Runtime configuration settings can be edited in the `properties.json` file. In addition, `properies.[environment].json` allows you to create multiple configs per environment (for example, `properties.development.json`).

For development environemnts, to view your app, navigate to `localhost:4000` by default.

For everything to work right, you will need to have the mongo daemon (`mongod`) and redis (`redis-server`) running, along with nodejs installed.

We also employ `Gateone` for our remote terminal features, so you'll need that too.

# Forge UX

The frontend portion of the projct has been divided into its own repo. Work currently needs to be done handle things like LESS proprocessing and other features of the frontend.

# Contributing

The code is not very well documented, and not nearly as clean as I'd like it to be, so feel free to ask questions if you noticed something weird.

# License 

Dronesmith Cloud is closed source, proprietary software. 