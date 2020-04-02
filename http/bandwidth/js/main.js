/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* global TimelineDataSeries, TimelineGraphView */



'use strict';

const remoteVideo = document.querySelector('video#remoteVideo');
const localVideo = document.querySelector('video#localVideo');
const callButton = document.querySelector('button#callButton');
const hangupButton = document.querySelector('button#hangupButton');
const bandwidthSelector = document.querySelector('select#bandwidth');
hangupButton.disabled = true;
callButton.onclick = call;
hangupButton.onclick = hangup;
var recorder; // globally accessible

var h1 = document.querySelector('h1');
var blobs = [];
let pc1;
let pc2;
let localStream;

// Can be set in the console before making a call to test this keeps
// within the envelope set by the SDP. In kbps.
// eslint-disable-next-line prefer-const
let maxBandwidth = 0;

let bitrateGraph;
let bitrateSeries;
let headerrateSeries;

let packetGraph;
let packetSeries;

let lastResult;

const offerOptions = {
  offerToReceiveAudio: 0,
  offerToReceiveVideo: 1
};


function printTrack(track, localStream) {
  //console.log(track);
  //console.log(localStream);
  pc1.addTrack(track, localStream);

}

function gotStream(stream) {
  hangupButton.disabled = false;
  console.log('Received local stream');
  localStream = stream;
  localVideo.srcObject = stream;
  localStream.getTracks().forEach(track => printTrack(track, localStream));
  console.log('Adding Local Stream to peer connection');

  pc1.createOffer(
      offerOptions
  ).then(
      gotDescription1,
      onCreateSessionDescriptionError
  );

  bitrateSeries = new TimelineDataSeries();
  bitrateGraph = new TimelineGraphView('bitrateGraph', 'bitrateCanvas');
  bitrateGraph.updateEndDate();

  headerrateSeries = new TimelineDataSeries();
  headerrateSeries.setColor('green');

  packetSeries = new TimelineDataSeries();
  packetGraph = new TimelineGraphView('packetGraph', 'packetCanvas');
  packetGraph.updateEndDate();
}

function onCreateSessionDescriptionError(error) {
  console.log('Failed to create session description: ' + error.toString());
}

function call() {
  callButton.disabled = true;
  bandwidthSelector.disabled = false;
  console.log('Starting call');
  const servers = null;
  pc1 = new RTCPeerConnection(servers);
  console.log('Created local peer connection object pc1');
  pc1.onicecandidate = onIceCandidate.bind(pc1);

  pc2 = new RTCPeerConnection(servers);
  console.log('Created remote peer connection object pc2');
  pc2.onicecandidate = onIceCandidate.bind(pc2);
  pc2.ontrack = gotRemoteStream;

  console.log('Requesting local stream');
  navigator.mediaDevices.getUserMedia({video: true})
      .then(gotStream)
      .catch(e => alert('getUserMedia() error: ' + e.name));
}

function gotDescription1(desc) {
  console.log('Offer from pc1 \n' + desc.sdp);
  pc1.setLocalDescription(desc).then(
      () => {
        pc2.setRemoteDescription(desc)
            .then(() => pc2.createAnswer().then(gotDescription2, onCreateSessionDescriptionError),
                onSetSessionDescriptionError);
      }, onSetSessionDescriptionError
  );
}

function gotDescription2(desc) {
  pc2.setLocalDescription(desc).then(
      () => {
        console.log('Answer from pc2 \n' + desc.sdp);
        let p;
        if (maxBandwidth) {
          p = pc1.setRemoteDescription({
            type: desc.type,
            sdp: updateBandwidthRestriction(desc.sdp, maxBandwidth)
          });
        } else {
          p = pc1.setRemoteDescription(desc);
        }
        p.then(() => {}, onSetSessionDescriptionError);
      },
      onSetSessionDescriptionError
  );
}

function hangup() {
  console.log('Ending call');
  localStream.getTracks().forEach(track => track.stop());
  pc1.close();
  pc2.close();
  pc1 = null;
  pc2 = null;
  hangupButton.disabled = true;
  callButton.disabled = false;
  bandwidthSelector.disabled = true;
}
function handleDataAvailable(event) {
  console.log("data-available");
  if (event.data.size > 0) {
    recordedChunks.push(event.data);
    console.log(recordedChunks);
    download();
  } else {
    // ...
  }
}
function download() {
  var blob = new Blob(recordedChunks, {
    type: "video/webm"
  });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  document.body.appendChild(a);
  a.style = "display: none";
  a.href = url;
  a.download = "test.webm";
  a.click();
  window.URL.revokeObjectURL(url);
}

function getMethods(obj) {
  var result = [];
  for (var id in obj) {
    try {
      if (typeof(obj[id]) == "function") {
        result.push(id + ": " + obj[id].toString());
      }
    } catch (err) {
      result.push(id + ": inaccessible");
    }
  }
  return result;
}

function trackInfo(track) {
  console.log("trackinfo");
  console.log(track);
  return false;
}

    // previewbuffer
    let pvVideo; 
    let pvSource = new MediaSource();
    pvVideo = document.getElementById("pvVideo");
    let pvopen;
    let buffer;
    pvSource.onsourceopen = () => {
      buffer = pvSource.addSourceBuffer("video/webm;codecs=vp8");
      console.log("pvsource opened");
      pvopen = true;
      buffer.addEventListener('updatestart', function(e) { console.log('updatestart: ' + pvSource.readyState); });
      buffer.addEventListener('update', function(e) { console.log('update: ' + pvSource.readyState); });
      buffer.addEventListener('updateend', function(e) { 
          pvSource.endOfStream();
          pvSource.duration = 120;
      //video.play();
          console.log('updateend: ' + pvSource.readyState); 

      });
      buffer.addEventListener('error', function(e) { console.log('error: ' + pvSource.readyState); });
      buffer.addEventListener('abort', function(e) { console.log('abort: ' + pvSource.readyState); });

      //     buffer.addEventListener('update', function() { // Note: Have tried 'updateend'
      //if (queue.length > 0 && !buffer.updating) {
       // buffer.appendBuffer(queue.shift());
      //}

    }


pvSource.addEventListener('sourceopen', function(e) { console.log('sourceopen: ' + pvSource.readyState); });
pvSource.addEventListener('sourceended', function(e) { console.log('sourceended: ' + pvSource.readyState); });
pvSource.addEventListener('sourceclose', function(e) { console.log('sourceclose: ' + pvSource.readyState); });
pvSource.addEventListener('error', function(e) { console.log("pvsource onerror: "); console.log(e); });

      pvVideo.src = URL.createObjectURL(pvSource);
    //pvVideo.controls = true;
    //pvVideo.autoplay = true;

const readAsArrayBuffer = function(blob) {
//      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          var ab = reader.result;
        //  if (pvSource.readyState == 'open') {
            
           // console.log("ready to receive");
           // console.log(buffer);
            buffer.ended = false;
            if (!buffer.updating) {
            //sourceBuffer.appendBuffer(new Uint8Array(xhr.response));
            buffer.appendBuffer(ab);
             } else
          { console.log("updating"); }
          //buf = pvSource.addSourceBuffer("video/webm;codecs=vp8");
        //  }

        };
        let x = reader.readAsArrayBuffer(blob);
        console.log('file read', x);

        //reader.onerror = (ev) => {
        //  reject(ev.error);
        //};
      //});
    }

function gotRemoteStream(e) {
  if (remoteVideo.srcObject !== e.streams[0]) {
    var remoteStream = e.streams[0];
    //  console.log("this is the remote streams and tracks: ");
     // console.log(remoteStream);

     // console.log("all tracks in remotestream: ");
     // remoteStream.getTracks().forEach(track => trackInfo(track));
     
      // recrding it
 //   var options = { mimeType: "video/webm; codecs=vp9" };
//    var options = { };
/*
    mediaRecorder = new MediaRecorder(remoteStream, options);

    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.start();
    // demo: to download after 9sec
    setTimeout(event => {
      console.log("stopping");
      mediaRecorder.stop();
    }, 9000);
*/

    var totalsize = 0
    var numblobs = 0;
    var recorder = RecordRTC(remoteStream, {
      recorderType: MediaStreamRecorder,
      mimeType: 'video/webm;codecs=vp8',
      timeSlice: 100, // pass this parameter
      getNativeBlob: true,
      ondataavailable: function(blob) {
      //  console.log(blob);
       
        blobs.push(blob);
        numblobs = 0;
       // console.log("size of blob: " + bytesToSize(blob.size));
        numblobs += 1;
        totalsize += blob.size;

        //console.log( "size in this callback: " + bytesToSize(blob.size) + 
         //             'Total blobs: ' + blobs.length + ' (Total size: ' + bytesToSize(totalsize) + ')' );
//https://github.com/video-dev/hls.js/blob/master/src/controller/buffer-controller.ts
      //  console.log("pvSource");
      //  console.log(pvSource)
        readAsArrayBuffer(blob);
               
              }
    });
      recorder.startRecording();

    remoteVideo.srcObject = e.streams[0];
    console.log('Received remote stream');
  }
}

function getOtherPc(pc) {
  return pc === pc1 ? pc2 : pc1;
}

function getName(pc) {
  return pc === pc1 ? 'pc1' : 'pc2';
}

function onIceCandidate(event) {
  getOtherPc(this)
      .addIceCandidate(event.candidate)
      .then(onAddIceCandidateSuccess)
      .catch(onAddIceCandidateError);

  //console.log(`${getName(this)} ICE candidate:\n${event.candidate ? event.candidate.candidate : '(null)'}`);
}

function onAddIceCandidateSuccess() {
  console.log('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  console.log('Failed to add ICE Candidate: ' + error.toString());
}

function onSetSessionDescriptionError(error) {
  console.log('Failed to set session description: ' + error.toString());
}

// renegotiate bandwidth on the fly.
bandwidthSelector.onchange = () => {
  bandwidthSelector.disabled = true;
  const bandwidth = bandwidthSelector.options[bandwidthSelector.selectedIndex].value;

  // In Chrome, use RTCRtpSender.setParameters to change bandwidth without
  // (local) renegotiation. Note that this will be within the envelope of
  // the initial maximum bandwidth negotiated via SDP.
  if ((adapter.browserDetails.browser === 'chrome' ||
       adapter.browserDetails.browser === 'safari' ||
       (adapter.browserDetails.browser === 'firefox' &&
        adapter.browserDetails.version >= 64)) &&
      'RTCRtpSender' in window &&
      'setParameters' in window.RTCRtpSender.prototype) {
    const sender = pc1.getSenders()[0];
    const parameters = sender.getParameters();
    if (!parameters.encodings) {
      parameters.encodings = [{}];
    }
    if (bandwidth === 'unlimited') {
      delete parameters.encodings[0].maxBitrate;
    } else {
      parameters.encodings[0].maxBitrate = bandwidth * 1000;
    }
    sender.setParameters(parameters)
        .then(() => {
          bandwidthSelector.disabled = false;
        })
        .catch(e => console.error(e));
    return;
  }
  // Fallback to the SDP munging with local renegotiation way of limiting
  // the bandwidth.
  pc1.createOffer()
      .then(offer => pc1.setLocalDescription(offer))
      .then(() => {
        const desc = {
          type: pc1.remoteDescription.type,
          sdp: bandwidth === 'unlimited' ?
          removeBandwidthRestriction(pc1.remoteDescription.sdp) :
          updateBandwidthRestriction(pc1.remoteDescription.sdp, bandwidth)
        };
        console.log('Applying bandwidth restriction to setRemoteDescription:\n' +
        desc.sdp);
        return pc1.setRemoteDescription(desc);
      })
      .then(() => {
        bandwidthSelector.disabled = false;
      })
      .catch(onSetSessionDescriptionError);
};

function updateBandwidthRestriction(sdp, bandwidth) {
  let modifier = 'AS';
  if (adapter.browserDetails.browser === 'firefox') {
    bandwidth = (bandwidth >>> 0) * 1000;
    modifier = 'TIAS';
  }
  if (sdp.indexOf('b=' + modifier + ':') === -1) {
    // insert b= after c= line.
    sdp = sdp.replace(/c=IN (.*)\r\n/, 'c=IN $1\r\nb=' + modifier + ':' + bandwidth + '\r\n');
  } else {
    sdp = sdp.replace(new RegExp('b=' + modifier + ':.*\r\n'), 'b=' + modifier + ':' + bandwidth + '\r\n');
  }
  return sdp;
}

function removeBandwidthRestriction(sdp) {
  return sdp.replace(/b=AS:.*\r\n/, '').replace(/b=TIAS:.*\r\n/, '');
}

// query getStats every second
window.setInterval(() => {
  if (!pc1) {
    return;
  }
  const sender = pc1.getSenders()[0];
  if (!sender) {
    return;
  }
  sender.getStats().then(res => {
    res.forEach(report => {
      let bytes;
      let headerBytes;
      let packets;
      if (report.type === 'outbound-rtp') {
        if (report.isRemote) {
          return;
        }
        const now = report.timestamp;
        bytes = report.bytesSent;
        headerBytes = report.headerBytesSent;

        packets = report.packetsSent;
        if (lastResult && lastResult.has(report.id)) {
          // calculate bitrate
          const bitrate = 8 * (bytes - lastResult.get(report.id).bytesSent) /
            (now - lastResult.get(report.id).timestamp);
          const headerrate = 8 * (headerBytes - lastResult.get(report.id).headerBytesSent) /
            (now - lastResult.get(report.id).timestamp);

          // append to chart
          bitrateSeries.addPoint(now, bitrate);
          headerrateSeries.addPoint(now, headerrate);
          bitrateGraph.setDataSeries([bitrateSeries, headerrateSeries]);
          bitrateGraph.updateEndDate();

          // calculate number of packets and append to chart
          packetSeries.addPoint(now, packets -
            lastResult.get(report.id).packetsSent);
          packetGraph.setDataSeries([packetSeries]);
          packetGraph.updateEndDate();
        }
      }
    });
    lastResult = res;
  });
}, 1000);
