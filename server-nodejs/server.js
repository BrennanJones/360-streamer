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

console.log('Server started. [' + (new Date()).toString() + ']');


/* CLIENT SOCKET SESSION IDs */
var broadcasterClientSocketSessionID = null;
var viewerClientSocketSessionID = null;

/* PEER */
var broadcasterClientPeerID;
var viewerClientPeerID;


io.sockets.on('connection', function(socket)
{
	var clientAddress = socket.request.connection.remoteAddress;

	console.log('A client (' + clientAddress + ') connected [' + (new Date()).toString() + ']');

	var clientType;

	socket.on('disconnect', function()
	{
		console.log(((clientType == 'Viewer' || clientType == 'Broadcaster') ? clientType : 'A') +
			' client (' + clientAddress + ') disconnected [' + (new Date()).toString() + ']');
		io.sockets.emit('ClientDisconnect', clientType);

		if (clientType == 'Viewer')
		{
			viewerClientSocketSessionID = null;
			viewerClientPeerID = null;
		}
		else if (clientType == 'Broadcaster')
		{
			broadcasterClientSocketSessionID = null;
			broadcasterClientPeerID = null;
		}
	});


	/**
	 * SOCKET MESSAGE HANDLERS
	 */
	
	/* DEBUGGING */
	
	socket.on('Echo', function(data)
	{
		console.log(data + '[' + (new Date()).toString() + ']');
	});


	/* CONNECTION */
	
	socket.on('ViewerClientConnect', function(data)
	{
		if (viewerClientSocketSessionID == null)
		{
			viewerClientSocketSessionID = socket.id;
			console.log('Viewer client connected (' + clientAddress + ') [' + (new Date()).toString() + ']');
			clientType = 'Viewer';
		}
		else
		{
			socket.disconnect('unauthorized');
			console.log('Unauthorized viewer client (' + clientAddress + ') tried to connect [' + (new Date()).toString() + ']');
		}
	});
	
	socket.on('BroadcasterClientConnect', function(data)
	{
		if (broadcasterClientSocketSessionID == null)
		{
			broadcasterClientSocketSessionID = socket.id;
			console.log('Broadcaster client connected (' + clientAddress + ') [' + (new Date()).toString() + ']');
			clientType = 'Broadcaster';
		}
		else
		{
			socket.disconnect('unauthorized');
			console.log('Unauthorized broadcaster client (' + clientAddress + ') tried to connect [' + (new Date()).toString() + ']');
		}
	});
	

	/* PEER */

	socket.on('BroadcasterClientPeerID', function(data)
	{
		console.log('BroadcasterClientPeerID: ' + data + ' [' + (new Date()).toString() + ']');

		broadcasterClientPeerID = data;
		trySendCallCommand();
	});
	
	socket.on('ViewerClientPeerID', function(data)
	{
		console.log('ViewerClientPeerID: ' + data + ' [' + (new Date()).toString() + ']');

		viewerClientPeerID = data;
		trySendCallCommand();
	});

	function trySendCallCommand()
	{
		if (viewerClientPeerID && broadcasterClientPeerID)
		{
			io.sockets.emit('CallCommand', viewerClientPeerID);
		}
	}
});
