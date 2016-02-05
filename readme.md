# Dronesmith Cloud

# Read this
https://docs.google.com/a/skyworksas.com/document/d/1MBC_XJI4MBlnFKsf7wPOWXr3pZnDD3V4Lx3Z4hY_baA/edit?usp=sharing

# Technologies
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
- ThreeJS
- Grunt
- SocketIO

# Running

	git submodule update --init
	npm install
	node app.js 


The `Grunt` taskloader is currently broken. 

Runtime configuration settings can be edited in the `properties.json` file. In addition, `properies.[environment].json` allows you to create multiple configs per environment (for example, `properties.development.json`).

For development environemnts, to view your app, navigate to `localhost:4000` by default.

For everything to work right, you will need to have the mongo daemon (`mongod`) and redis (`redis-server`) running, along with nodejs installed.

# Forge UX

The frontend portion of the projct has been divided into its own repo. Work currently needs to be done handle things like LESS proprocessing and other features of the frontend. 

# Contributing

Contributing is pretty standard. See the todo list for things to work on and bugs to fix. 

<!--1. Assigned yourself an unassigned **FORG** ticket in Jira.
2. git branch FORG-[ticketnumber] (eg, FORG-45)-->
3. Implement your work on a development branch.
4. Make a pull request to master when you are ready
5. Geoff will do a code review of this pull req, and if everything looks good, will give the thumbs up and merge it.

The code is not very well documented, and not nearly as clean as I'd like it to be, so feel free to ask questions if you noticed somethign weird. 


# Ideas

Ideas, brainstorming, and out-of-the-box thinking are encouraged! Please ping Geoff and/or Greg on Slack to bounce ideas around, or post it in the `#forge-dev` channel on Slack.