/**
 *
 * main.js
 * Main JavaScript code
 *
 */


'use strict';

jQuery(function()
{
  var url = "https://" + window.location.hostname + ":8082";
  
  var socket = io.connect(url);
  
  var doc = jQuery(document),
      win = jQuery(window);

  const thetaview = new ThetaView();


  /**
   * SOCKET MESSAGE HANDLERS
   */

  /* CONNECTION */

  socket.on('connect', function()
  {
    console.log('socket.io connected');

    if (window.clientType == 'Viewer')
    {
      socket.emit('ViewerClientConnect', null);
    }
    else if (window.clientType == 'Broadcaster')
    {
      socket.emit('BroadcasterClientConnect', null);
    }
  });

  socket.on('disconnect', function()
  {
    console.log('socket.io disconnected');

    alert("Connection with server failed.")
  });

  /* PEER */

  socket.on('CallCommand', function(viewerClientPeerID)
  {
    if (window.clientType == 'Broadcaster')
    {
      console.log('CallCommand');

      var call = peer.call(viewerClientPeerID, window.localStream);
      step3(call);
    }
  });

  /* OTHER */

  socket.on('ClientDisconnect', function(clientType)
  {
    console.log('ClientDisconnect: ' + clientType);

    if (clientType == 'Broadcaster' || clientType == 'Viewer')
    {
      if (window.existingCall)
      {
        window.existingCall.close();
        if (clientType == 'Viewer')
        {
          stop360();
        }
      }
    }
  });


  /**
   * PEER VIDEO CHAT
   */

  // Compatibility shim
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

  // PeerJS object
  var peer = new Peer(
    { host: window.location.hostname, port: 8055, path: '/peer', secure: true, debug: 3 },
    //{ key: 's51s84ud22jwz5mi' },
    { config: {'iceServers': [
      {
        url: 'turn:numb.viagenie.ca',
        credential: 'dvc',
        username: 'brennandgj@gmail.com',
        password: 'dvcchat'
      }
    ]}});

  peer.on('open', function()
  {
    console.log('open');
    step1();
  });

  // Receiving a call
  peer.on('call', function(call)
  {
    console.log('call');

    call.answer();
    step3(call);
  });

  peer.on('error', function(err)
  {
    console.log("error");
    
    //alert(err.message);
    step2();
  });

  function step1()
  {
    if (window.clientType == 'Viewer')
    {
      socket.emit('ViewerClientPeerID', peer.id);
    }
    else if (window.clientType == 'Broadcaster')
    {
      // Get audio/video stream
      navigator.getUserMedia({audio: true, video: true}, function(stream)
      {
        window.localStream = stream;
        socket.emit('BroadcasterClientPeerID', peer.id);
      },
      function()
      {
        console.log("step 1 error");
      });
    }
  }

  function step2()
  {
    // Nothing happens here, but code could go here later.
  }

  function step3(call)
  {
    // Hang up on an existing call if present
    if (window.existingCall)
    {
      window.existingCall.close();
    }

    // Wait for stream on the call, then set peer video display
    call.on('stream', function(stream)
    {
      console.log('stream');

      if (window.clientType == 'Viewer')
      {
        $('#theirVideo').prop('src', URL.createObjectURL(stream));

        console.log('start360');
        start360();
      }
    });

    window.existingCall = call;
    call.on('close', step2);
  }


  /**
   * 360-DEGREE VIDEO
   */

  function start360()
  {
  	thetaview.setContainer($('#videoContainer')[0]);
  	thetaview.start($('#theirVideo')[0]);
  }

  function stop360()
  {
  	thetaview.stop($('#theirVideo')[0]);
  }
});
