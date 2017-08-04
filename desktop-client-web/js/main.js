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

  var mediaSource;
  var mediaRecorder;
  var recordedBlobs;
  var sourceBuffer;
  //var videoRecordCanvasStream;
  var recordingStarted = false;


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
    if (recordingStarted)
    {
      stopRecording();
      recordingStarted = false;
      download();
    }
  }

  function step3(call)
  {
    // Hang up on an existing call if present
    if (window.existingCall)
    {
      window.existingCall.close();
    }

    if (window.clientType == 'Broadcaster')
    {
      //$('#localVideo').prop('src', URL.createObjectURL(window.localStream));

      // $('#videoRecordCanvas').width  = $('#localVideo').videoWidth;
      // $('#videoRecordCanvas').height = $('#localVideo').videoHeight;

      // videoRecordCanvasStream = $('#videoRecordCanvas').captureStream(); // frames per second
      // videoRecordCanvasStream = document.querySelector('canvas').captureStream(); // frames per second

      mediaSource = new MediaSource();
      mediaSource.addEventListener('sourceopen', handleSourceOpen, false);

      startRecording();
      recordingStarted = true;

      // setTimeout(recordPoll, 2000);
    }
    else // if (window.clientType == 'Viewer')
    {
      // Wait for stream on the call, then set peer video display
      call.on('stream', function(stream)
      {
        console.log('stream');

        $('#remoteVideo').prop('src', URL.createObjectURL(stream));

        console.log('start360');
        start360();
      });
    }

    window.existingCall = call;
    call.on('close', step2);
  }


  /**
   * RECORDING
   */

  function handleSourceOpen(event)
  {
    console.log('MediaSource opened');
    sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp8"');
    console.log('Source buffer: ', sourceBuffer);
  }

  function handleDataAvailable(event)
  {
    if (event.data && event.data.size > 0)
    {
      recordedBlobs.push(event.data);
    }
  }

  function handleStop(event)
  {
    console.log('Recorder stopped: ', event);
  }

  function startRecording()
  {
    var options = {mimeType: 'video/webm'};
    recordedBlobs = [];

    // The nested try blocks will be simplified when Chrome 47 moves to Stable
    try
    {
      // mediaRecorder = new MediaRecorder(videoRecordCanvasStream, options);
      mediaRecorder = new MediaRecorder(window.localStream, options);
    }
    catch (e0)
    {
      console.log('Unable to create MediaRecorder with options Object: ', e0);
      try
      {
        options = {mimeType: 'video/webm,codecs=vp9'};
        // mediaRecorder = new MediaRecorder(videoRecordCanvasStream, options);
        mediaRecorder = new MediaRecorder(window.localStream, options);
      }
      catch (e1)
      {
        console.log('Unable to create MediaRecorder with options Object: ', e1);
        try
        {
          options = 'video/vp8'; // Chrome 47
          // mediaRecorder = new MediaRecorder(videoRecordCanvasStream, options);
          mediaRecorder = new MediaRecorder(window.localStream, options);
        }
        catch (e2)
        {
          alert('MediaRecorder is not supported by this browser.\n\n' +
              'Try Firefox 29 or later, or Chrome 47 or later, with Enable experimental Web Platform features enabled from chrome://flags.');
          console.error('Exception while creating MediaRecorder:', e2);
          return;
        }
      }
    }

    console.log('Created MediaRecorder', mediaRecorder, 'with options', options);
    mediaRecorder.onstop = handleStop;
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.start(100); // collect 100ms of data
    console.log('MediaRecorder started', mediaRecorder);
  }

  function stopRecording()
  {
    mediaRecorder.stop();
    console.log('Recorded Blobs: ', recordedBlobs);
  }

  function download()
  {
    var blob = new Blob(recordedBlobs, {type: 'video/webm'});
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'test.webm';
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  }

  // function recordPoll()
  // {
  //   // var videoRecordCanvas = $('#videoRecordCanvas');
  //   var videoRecordCanvas = document.querySelector('canvas');

  //   var ctx = videoRecordCanvas.getContext('2d');
  //   ctx.drawImage(document.getElementById('localVideo'), 0, 0, videoRecordCanvas.width, videoRecordCanvas.height);

  //   setTimeout(recordPoll, 33);
  // }


  /**
   * 360-DEGREE VIDEO
   */

  function start360()
  {
  	thetaview.setContainer($('#videoContainer')[0]);
  	thetaview.start($('#remoteVideo')[0]);
  }

  function stop360()
  {
  	thetaview.stop($('#remoteVideo')[0]);
  }
});
