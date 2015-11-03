# Forge Cloud
## API Documentation

### Access & API Key
API keys are currently private and only given by special request. Any given API key should not be public. The following headers are required to make a valid request to the API.

	curl -h \
		user-email=<your-email> \ 
		user-pass=<mypass> \
	 	user-key=<apikey> \
	 		stage.dronesmith.io/cloud/user/123abc
	 		
Without a valid api key and account, the server will respond with code `403` (not authorized).

All api endpoints point to `stage.dronesmith.io/cloud/`.

All api requests are handled as standard practice with `GET/POST/PUT/DELETE` HTTP headers. The responses will always be in [JSON](https://en.wikipedia.org/wiki/JSON) format. 

#### Error Handling
User-defined errors besides `403`s will have the response code `400`. Server side error codes *should not* happen, but if they do, you will see a `500` code. `400` errors will respond the following JSON object:

Return **400**:

	{ 
		"error" : "message about the error." 
	}

### Session
Sessions are useful for obtaining current activity of a user, such as if the user is currently online, or if they are flying a drone or not. The session manager also handles authentication. Current authentication is basic and only requires an email and password. 

#### Log in / Log out

To log a user in and start a session on your respective device, use the following request:

	POST /session/authenticate
	
	POST Body
	{
		email: String,
		password: String
	}
	
The log in will return a public `User` object if sucessful. Else, an error message is returned. 

As is with basic authentication, the session only lasts as long as the application is running. Once the connection with the server ends, the session ends with it. To manually log out a user, simply send the same request with the `deauth` boolean set to true:

	POST /session/authenticate
	
	POST Body 
	{
		deauth: true,
		email: String,
		password: String
	}
	
The response for a successful log out will be `{ "userData": null }`.

#### Query a session

Querying the user's session can be dones by sending the user's id. It returns the user's status

	GET /session/
	
Return **200**:

	{
		status: "active",
		lastLogin: Date,
		userData: {	
			...	
		}
	}
	
A `{ "status": "expired" }` indicates the user is currently not online.

### User
The `/user/` endpoint provides information for querying user accounts. Currently, you may only query a restricted subset of user information via get requests. 

Here is the public schema:
	
	email 		: String,
	fullName 	: String <optional>,
	company		: String <optional>,
	kind 		: enumeration,
	created 	: Date,
	lastLogin 	: Date,
	userAgent 	: String,
	ipAddr		: String,
	drones 		: [Drone] <optional>
	
The userAgent property contains information about the browser and operating system the user used when they last logged in. ipAddr contains the last used IP address.
	
#### Query user(s) `GET /user/{id}?<querystring>`
Find a user by a specific id. `id` is not required. 

Example: Get a list of all users who identify as developers.

	GET /user?kind=developer
	
Return **200**:

	{
		total: 34,
		users: [
			{
				<user1> ...
				id: 123abc,
				kind: "developer"
			}, 
			{
				<user2> ...
				id: 456def,
				kind: "developer"
			}, 
			...
		]
	}

Query a single user. 

	GET /user/abc123
	
Return **200**:
	
	{
		email: "example@skyworksas.com",
		created: "",
		kind: "",
		drones: [
			123456,
			abcdef
		]	
	}

When not querying with `id`, you can also use **offset** and **size** fields divide up a query into multiple pieces (pagination), suitable for large queries. 

	GET /user?offset=90&size=50 
	
Return **200**:

	{
		total: 200,
		size: 50,
		offset: 90,
		users: [
			{ <user90> },
			{ <user91> },
			...
			{ <user139> }
		]
	} 
	
Note that if the offset or size are out of range, they will default to 0 for offset, and 1 for size. The offset is 0 indexed. 

#### Sorting

When not querying with `id` you can use **sort** option to sort by one of the attributes of the field. For instance:

	GET /user?size=50&sort=+updated
	
Returns the first 50 entries of the user list who logged in last sorted in ascending order. All sort options ***must*** be prefixed with a + for ascending order, or - for descending order. 

#### Add a drone to a user `PUT /user/id/drone_id`

It is recommended though not required that drone be associated with a specific user. This can be by issuing a PUT request with the user id, followed by the drone id. `{ "status" : "ok" }` is returned. 	

#### Remove a drone from a user `DELETE /user/id/drone_id`

By the same virtue, one can remove a drone from a user with a DELETE request. Again, `{ "status" : "ok"}` is returned on success.

### Drone

The `/Drone/` public schema contains information pertaining to a particular UAV in question.

	name : String <optional>,
	systemId : Number,
	manufacturer : String <optional>,
	created : Date,
	updated : Date,
	missions: [Mission] <optional>,
	parameters: Object

The parameters field is an associative array that contains a list of the drone's [parameters](https://pixhawk.org/firmware/parameters). You can think of these as settings for the drone. This should be updated whenever the drone object is updated.

Querying a drone is similar to querying a user, but offers a more advanced query format to facilitate querying by different parameters.

#### Query drones(s) `GET /drone/{id}?<querystring>`
Find a drone by a specific id. `id` is not required.

Example: Get a list of all drones with UAVCAN disabled:

	GET /drone?parameters.UAVCAN_ENABLE=0
	
Return **200**:

	{
		total: 2,
		drones: [
			{
				<drone1>
				id: 123abc,
				parameters: {
					UAVCAN_ENABLE: 0,
					...
				}
				...
			}, 
			{
				<drone2>
				id: 456def,
				parameters: {
					UAVCAN_ENABLE: 0,
					...
				}
				...
			}, 
			...
		]
	}

Query a single drone, just enter its id.  

	GET /drone/abc123
	
Return **200**:
	
	{
		name: "myDrone1"
		systemId: 34
		created: "",
		updated: "",
		missions: [
			123456,
			abcdef
		],
		parameters: {
			...
		}	
	}

When not querying with `id`, you can also use **offset** and **size** fields divide up a query into multiple pieces (pagination), suitable for large queries. 

	GET /drone?offset=90&size=50 
	
Return **200**:

	{
		total: 200,
		size: 50,
		offset: 90,
		drones: [
			{ <drone90> },
			{ <drone91> },
			...
			{ <drone139> }
		]
	} 
	
Note that if the offset or size are out of range, they will default to 0 for offset, and 1 for size. The offset is 0 indexed. 

#### Sorting

When not querying with `id` you can use **sort** option to sort by one of the attributes of the field. For instance:

	GET /drone?size=50&sort=+updated
	
Returns the first 50 entries of the drone list who've been updated last sorted in ascending order. All sort options ***must*** be prefixed with a + for ascending order, or - for descending order.  

#### Add a drone `POST /drone/`

Allows you to create a new drone. The returned object will echo the parameters sent along with the server's filled in fields (such as the drone id)

	POST /drone/
	
	POST Body
	{
		systemId: 254,
		parameters: {}
	}

#### Remove a drone `DELETE /drone/id`

	DELETE /drone/abc123
	
Return **200**:
	
	{"status": "OK"}
	
This status message indicates the drone was successfully deleted. 

#### Update a drone `PUT /drone/id`

	PUT /drone/abc123
	
	PUT Body
	{
		drone: {
			parameters: {}
		}
	}

### Mission

The mission schema is organized as a sequence of MAVLink log format entries.

	name 		: String <optional>,
	start 		: Date,
	end 		: Date <optional>,
	user 		: User <optional>,
	flight: [
		{
			time : Date,
			message : Number,
			systemID : Number,
			componentID : Number,
			payload : Object <optional>
		}
	] <optional>,
	parameters: Object

Each mission will append a UTC Date formatted timestap at the beginning of a mission. The MAVLink log data is represented as a sequence of MAVLink packet entries. Typical flight times are within the range of 5-15 minutes. As MAVLink packets tend to output around 60 times a second, you can expect this array will be extremely large, even on smaller flights. 

The parameters object contains a copy of the settings that were made for the drone during the flight. This is different from the parameters field in the drone itself typically. 

The end timestamp is optional; however, all completed flights will have an end timestamp. The lack of this stamp indicates the flight is ongoing. If the mission failed to receive any data from the drone as a connection error, it will fill this field in with `null`. 

#### Query drones(s) `GET /mission/{id}?<querystring>`
Find a drone by a specific id. `id` is not required.

Example: Get a list of all missions with UAVCAN disabled:

	GET /mission?parameters.UAVCAN_ENABLE=0
	
Return **200**:

	{
		total: 2,
		missions: [
			{
				<mission1>
				id: 123abc,
				parameters: {
					UAVCAN_ENABLE: 0,
					...
				}
				...
			}, 
			{
				<mission2>
				id: 456def,
				parameters: {
					UAVCAN_ENABLE: 0,
					...
				}
				...
			}, 
			...
		]
	}

Query a single drone, just enter its id.  

	GET /mission/abc123
	
Return **200**:
	
	{
		name: "myMission1"
		start: "",
		parameters: {
			...
		}	
	}

When not querying with `id`, you can also use **offset** and **size** fields divide up a query into multiple pieces (pagination), suitable for large queries. 

	GET /mission?offset=90&size=50 
	
Return **200**:

	{
		total: 200,
		size: 50,
		offset: 90,
		drones: [
			{ <mission90> },
			{ <mission91> },
			...
			{ <mission139> }
		]
	} 
	
Note that if the offset or size are out of range, they will default to 0 for offset, and 1 for size. The offset is 0 indexed. 

#### Sorting

When not querying with `id` you can use **sort** option to sort by one of the attributes of the field. For instance:

	GET /mission?size=50&sort=+updated
	
Returns the first 50 entries of the drone list who've been updated last sorted in ascending order. All sort options ***must*** be prefixed with a + for ascending order, or - for descending order.  

