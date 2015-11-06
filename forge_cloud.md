# Forge Cloud
## API Documentation

### Access & API Key
API keys are currently private and only given by special request. Any given API key should be kept secret. The following custom HTTP headers are required to make a valid request to the API.

	curl -H user-email=<your-email> \ 
	 	 -H user-key=<apikey> \
	 		stage.dronesmith.io/api/user/123abc
	 		
Without a valid api key and account, the server will respond with code `401` (not authorized).

All api endpoints point to `stage.dronesmith.io/api/`.

All api requests are handled in standard practice with `GET/POST/PUT/DELETE` HTTP headers. The responses will always be in [JSON](https://en.wikipedia.org/wiki/JSON) format. 

#### Gimme

To obtain API keys, please contact [geoff@skyworksas.com](mailto:geoff@skyworksas.com). 

#### Error Handling
User-defined errors besides `401`s will have the response code `400`. Server side error codes *should not* happen, but if they do, you will see a `500` code. `400` errors will respond the following JSON object:

Return **400**:

	{ 
		"error" : "message about the error." 
	}

### User `/api/user/`
The user endpoint provides information for querying user accounts. Currently, you may only query a restricted subset of user information via GET requests. 

Here is the public schema:
	
	id			: Unique identifier
	email 		: String,
	fullName 	: String <optional>,
	company		: String <optional>,
	kind 		: Enumerated String,
	Otherkind	: String
	created 	: Date,
	lastLogin 	: Date,
	userAgent 	: String,
	ipAddr		: String,
	drones 		: Array of [Drone] <optional>
	
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

#### Pagination

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

It is recommended though not required that a drone be associated with a specific user. This can be done by issuing a PUT request with the user id, followed by the drone id. `{ "status" : "ok" }` is returned. 	

#### Remove a drone from a user `DELETE /user/id/drone_id`

By the same virtue, one can remove a drone from a user with a DELETE request. Again, `{ "status" : "ok"}` is returned on success.

### Drone `/api/drone/`

The public schema contains information pertaining to a particular UAV in question.

	id				: Unique Identifier
	name 			: String <optional>,
	systemId 		: Number,
	manufacturer 	: String <optional>,
	created 		: Date,
	updated 		: Date <optional>,
	hardwareId		: String <optional>,
	firmwareId		: String <optional>,
	parameters		: Mixed Object,
	missions		: Array of [Mission] <optional>

The parameters field is an associative array that contains a list of the drone's [parameters](https://pixhawk.org/firmware/parameters). You can think of these as settings for the drone. This should be updated whenever the drone object is updated.

Each drone is required to have systemId. This should correspond to its `MAVLink` id and is defaulted to 1. It is advised but not required that each drone have a different systemId. 

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

#### Pagination
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
	
#### Add a mission to a drone `PUT /drone/addMission/id/`

It is recommended though not required that a mission be associated with a specific drone. This can be done by issuing a PUT request with the drone id, and including the middion id in the body:

	PUT /drone/addMission/abc123
	
	PUT Body
	{
		missionId: def456
	}

Response **200**:

	{
		status: "OK"
	}


#### Remove a mission from a drone `DELETE /drone/removeMission/id`

By the same virtue, one can remove a mission from a from with a DELETE request. Again, `{ "status" : "ok"}` is returned on success.

	DELETE /drone/addMission/abc123
	
	DELETE Body
	{
		missionId: def456
	}

Response **200**:

	{
		status: "OK"
	}


### Mission `/api/mission/`

The mission schema is organized as a sequence of MAVLink log format entries.

	name 		: String <optional>,
	kind		: Enumerated String,
	start 		: Date,
	end 		: Date <optional>,
	user 		: User <optional>,
	errCount	: Number,
	flight: Array of [
		{
			time 			: Date <optional>,
			message 		: Number or String,
			systemID 		: Number,
			componentID 	: Number <optional>,
			payload 		: Mixed Object <optional>
		}
	] <optional>,
	parameters: Mixed Object

The mission schema is designed to be flexible to allowing many different flight logging formats. The current two that are being used are `sdlog` and `mavlink log` formats. Both of them are encoded into the following schema, but have different formats.

The **mavlink log** format is a telemetry based ascii implementation that uses MAVLink messages as the basis of its datapoints. Such data includes a systemId, componentId, message number (which corresponds to type), and a time stamp at the end of each mesage. The payload is determined by the message type. Most of the data on Forge will be in the this format. You read more about it [here](http://qgroundcontrol.org/dev/logging).

The **sdlog** format is a high-resolution binary based implementation that uses a dynamic look-up table mapped by its header. In essence, this format's actual data is defined on the fly by the header itself; however, to stay consistant, most of the messages are uniformly supported by different UAVs and ground control stations. This format does not time stamp each data point, and uses strings to represent message names. You can view more information about it [here](https://pixhawk.org/firmware/apps/sdlog2).

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

Please note that you will **not** be able to view raw flight data points when querying multiple missions. You **must** query a single mission to view its datapoints. 

Query a single mission, just enter its id.  

	GET /mission/abc123
	
Return **200**:
	
	{
		name: "myMission1"
		start: "",
		parameters: {
			...
		}	
	}
	
#### Pagination

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

#### Add a Mission `POST /mission/kind`

To add a mission, simply send your mavlink log (in JOSN format) or an sdlog (in binary format). `kind` should be `mavlink` for the former and `sdlog` for the latter, else parsing errors may occur.

`{status: "OK"}` JSON object is returned if successful. Please note that with high volume uploads, this request may take a while, so do not use short timeouts. Forge's maximum upload size is **50MB**. Please do not abuse this liberally large request size, or I will shorten it.  

#### Remove a Mission `DELETE /mission/id`

Deleting missions simply involves entering the mission id. `{status: "OK"}` JSON object is returned if successful.