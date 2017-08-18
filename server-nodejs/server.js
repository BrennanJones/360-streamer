/**
 *
 * server.js
 * Node.js Server
 *
 */


"use strict";

var filesystem = require('fs');

var options = {
  key: filesystem.readFileSync('key.pem'),
  cert: filesystem.readFileSync('cert.pem')
};

var app = require('https').createServer(options, handler);
var io = require('socket.io', { rememberTransport: false, transports: ['WebSocket', 'Flash Socket', 'AJAX long-polling'] })(app);
var node_static = require('node-static');
var fs = new node_static.Server('../desktop-client-web');
var PeerServer = require('peer').PeerServer;
var server = PeerServer(
	{
		port: 8055,
		path: '/peer',
		ssl:
		{
    		key: filesystem.readFileSync('key.pem'),
    		cert: filesystem.readFileSync('cert.pem')
    	}
    });

// If the URL of the server is opened in a browser.
function handler(request, response)
{
	request.addListener('end', function() {
		fs.serve(request, response);
	}).resume();
}

app.listen(8082);

var serverStartedDate = Date.now();
console.log('Server started. [' + (new Date()).toString() + ']');

filesystem.mkdirSync('./data/' + serverStartedDate);


/* CLIENT SOCKET SESSION IDs */
var broadcasterClientSocketSessionID = null;
var viewerClientSocketSessionID = null;
var investigatorClientSocketSessionID = null;

/* PEER */
var broadcasterClientPeerID;
var viewerClientPeerID;
var callIsOnline = false;

/* LOG FILE */
var logFileWriteStream = filesystem.createWriteStream('data/' + serverStartedDate + '/log.csv');

/* LOGGED INFORMATION */
var pairID;
var taskStage = 'NONE';


io.sockets.on('connection', function(socket)
{
	var clientAddress = socket.request.connection.remoteAddress;

	console.log('A client (' + clientAddress + ') connected [' + (new Date()).toString() + ']');

	var clientType;

	socket.on('disconnect', function()
	{
		console.log(((clientType == 'Broadcaster' || clientType == 'Viewer' || clientType == 'Investigator') ? clientType : 'A') +
			' client (' + clientAddress + ') disconnected [' + (new Date()).toString() + ']');
		io.sockets.emit('ClientDisconnect', clientType);

		if (clientType == 'Broadcaster')
		{
			broadcasterClientSocketSessionID = null;
			broadcasterClientPeerID = null;
		}
		else if (clientType == 'Viewer')
		{
			viewerClientSocketSessionID = null;
			viewerClientPeerID = null;
		}
		else if (clientType == 'Investigator')
		{
			investigatorClientSocketSessionID = null;
		}
	});


	if (broadcasterClientSocketSessionID != null)
	{
		socket.emit('ClientConnect', 'Broadcaster');
	}
	else
	{
		socket.emit('ClientDisconnect', 'Broadcaster');
	}

	if (viewerClientSocketSessionID != null)
	{
		socket.emit('ClientConnect', 'Viewer');
	}
	else
	{
		socket.emit('ClientDisconnect', 'Viewer');
	}

	if (callIsOnline)
	{
		socket.emit('CallOnline');
	}
	else
	{
		socket.emit('CallOffline')
	}

	if (taskStage != 'NONE')
	{
		socket.emit('TaskStageBegin', taskStage);
	}

	socket.emit('UpdatedPairID', pairID);


	/**
	 * SOCKET MESSAGE HANDLERS
	 */
	
	/* DEBUGGING */
	
	socket.on('Echo', function(data)
	{
		console.log(data + '[' + (new Date()).toString() + ']');
	});


	/* CONNECTION */

	socket.on('BroadcasterClientConnect', function(data)
	{
		if (broadcasterClientSocketSessionID == null)
		{
			broadcasterClientSocketSessionID = socket.id;
			console.log('Broadcaster client connected (' + clientAddress + ') [' + (new Date()).toString() + ']');
			clientType = 'Broadcaster';

			io.sockets.emit('ClientConnect', 'Broadcaster');
		}
		else
		{
			socket.disconnect('unauthorized');
			console.log('Unauthorized broadcaster client (' + clientAddress + ') tried to connect [' + (new Date()).toString() + ']');
		}
	});

	socket.on('ViewerClientConnect', function(data)
	{
		if (viewerClientSocketSessionID == null)
		{
			viewerClientSocketSessionID = socket.id;
			console.log('Viewer client connected (' + clientAddress + ') [' + (new Date()).toString() + ']');
			clientType = 'Viewer';
			
			io.sockets.emit('ClientConnect', 'Viewer');
		}
		else
		{
			socket.disconnect('unauthorized');
			console.log('Unauthorized viewer client (' + clientAddress + ') tried to connect [' + (new Date()).toString() + ']');
		}
	});

	socket.on('InvestigatorClientConnect', function(data)
	{
		if (investigatorClientSocketSessionID == null)
		{
			investigatorClientSocketSessionID = socket.id;
			console.log('Investigator client connected (' + clientAddress + ') [' + (new Date()).toString() + ']');
			clientType = 'Investigator';
		}
		else
		{
			socket.disconnect('unauthorized');
			console.log('Unauthorized investigator client (' + clientAddress + ') tried to connect [' + (new Date()).toString() + ']');
		}
	});
	

	/* PEER */

	socket.on('BroadcasterClientPeerID', function(data)
	{
		console.log('BroadcasterClientPeerID: ' + data + ' [' + (new Date()).toString() + ']');

		broadcasterClientPeerID = data;
		//trySendCallCommand();
	});
	
	socket.on('ViewerClientPeerID', function(data)
	{
		console.log('ViewerClientPeerID: ' + data + ' [' + (new Date()).toString() + ']');

		viewerClientPeerID = data;
		//trySendCallCommand();
	});

	socket.on('CallOnline', function(data)
	{
		console.log('CallOnline [' + (new Date()).toString() + ']');
		
		callIsOnline = true;
		io.sockets.emit('CallOnline');

		logFileWriteStream.write(
			pairID + ',' +
			Date.now() + ',' +
			new Date()).toString() + ',' +
			'ModeSwitch' + ',' +
			'360Mode' + ',' +
			',' +
			',' +
			',' +
			',' +
			',' +
			taskStage + '\n' );
	});

	socket.on('CallOffline', function(data)
	{
		console.log('CallOffline [' + (new Date()).toString() + ']');
		
		callIsOnline = false;
		io.sockets.emit('CallOffline');

		logFileWriteStream.write(
			pairID + ',' +
			Date.now() + ',' +
			new Date()).toString() + ',' +
			'ModeSwitch' + ',' +
			'StandardMode' + ',' +
			',' +
			',' +
			',' +
			',' +
			',' +
			taskStage + '\n' );
	});


	/* INVESTIGATOR CONTROLS */

	socket.on('I_StartCall', function(data)
	{
		console.log('I_StartCall [' + (new Date()).toString() + ']');
		
		if (callIsOnline)
		{
			io.sockets.emit('EndCall');
		}
		
		trySendCallCommand();
	});

	socket.on('I_EndCall', function(data)
	{
		console.log('I_EndCall [' + (new Date()).toString() + ']');
		
		if (callIsOnline)
		{
			io.sockets.emit('EndCall');
		}
	});

	socket.on('I_UpdatePairID', function(data)
	{
		console.log('I_UpdatePairID: ' + data + ' [' + (new Date()).toString() + ']');
		pairID = data;
		io.sockets.emit('UpdatedPairID', pairID);
	});

	socket.on('I_TaskStageBegin', function(data)
	{
		console.log('I_TaskStageBegin: ' + data + ' [' + (new Date()).toString() + ']');
		
		taskStage = data;
		io.sockets.emit('TaskStageBegin', taskStage);

		logFileWriteStream.write(
			pairID + ',' +
			Date.now() + ',' +
			new Date()).toString() + ',' +
			'TaskStageBegin' + ',' +
			(callIsOnline ? '360Mode' : 'StandardMode') + ',' +
			',' +
			',' +
			',' +
			',' +
			',' +
			taskStage + '\n' );
	});

	socket.on('I_TaskStageEnd', function()
	{
		console.log('I_TaskStageEnd [' + (new Date()).toString() + ']');

		logFileWriteStream.write(
			pairID + ',' +
			Date.now() + ',' +
			new Date()).toString() + ',' +
			'TaskStageEnd' + ',' +
			(callIsOnline ? '360Mode' : 'StandardMode') + ',' +
			',' +
			',' +
			',' +
			',' +
			',' +
			taskStage + '\n' );

		taskStage = 'NONE';
		io.sockets.emit('TaskStageEnd');
	});


	/* LOGGING */

	socket.on('LogCameraInfo', function(cameraInfo)
	{
		logFileWriteStream.write(
			pairID + ',' +
			Date.now() + ',' +
			new Date()).toString() + ',' +
			'UpdatedCameraInfo' + ',' +
			/* (callIsOnline ? '360Mode' : 'StandardMode') */ '360Mode' + ',' +
			cameraInfo.worldDirection.x + ',' +
			cameraInfo.worldDirection.y + ',' +
			cameraInfo.worldDirection.z + ',' +
			cameraInfo.fov + ',' +
			cameraInfo.aspect + ',' +
			taskStage + '\n' );
	});


	function trySendCallCommand()
	{
		if (viewerClientPeerID && broadcasterClientPeerID)
		{
			io.sockets.emit('StartCall', {
				viewerClientPeerID: viewerClientPeerID,
				currentServerTime: Date.now()
			});
		}
	}
});
