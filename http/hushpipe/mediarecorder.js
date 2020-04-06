'use strict';

import * as utils from "./utils.js";
import * as mp from "./mediaplayer.js";



const TYPE = 'audio';

const CAPTURE_CONSTRAINTS = {audio: true};
//const MIMETYPE = 'audio/webm;codecs=opus';
//const MIMETYPE = 'video/webm;codecs=vp8,vorbis'
const MIMETYPE = 'video/webm;codecs=vp8';

const REC_MS = 2000;
const RECOPT = { 
  audioBitsPerSecond :  64000,
  latency : 0,
  frameRate: 10,
  height: 640,
  width: 480,
  //videoBitsPerSecond : 2500000,
  //bitsPerSecond:       2628000,
  mimeType : MIMETYPE,
  //noiseSuppression: true,
  //echoCancellation: true,
  //frameRate: { ideal: 20, max: 25, } /* or just video:true*/
  // facingMode: 'user' // use selfie-cam, !shoot-my-swimming-pool-cam
  // sampleRate: 99999, /// Hz
  //latency: 99.99, /// seconds
};

let debug_filecount = 0;
/****/
let latest = 0 ;
let debug = true;
let chunks = []

async function
chunk_rec_callback(blob_event)
{
    //console.log('got blob event', blob_event);
    const blob_e = blob_event;
    let chunk = new Uint8Array(await blob_event.data.arrayBuffer());
    chunks.push(chunk);

    if (blob_event.data && debug) {
      debug_filecount += 1;
      utils.saveBlob(blob_event.data, "chunk_video_" + debug_filecount + ".webm", false);
    }
}

async function
capture_works(stream, status_el) {
    console.log('cam_works: ', stream);
    status_el.appendChild(document.createTextNode('capturing..' ));

    const hush_camera_handle = new MediaRecorder(stream, RECOPT);
    //hush_camera_handle.mode = 'sequence';
    hush_camera_handle.ondataavailable = chunk_rec_callback;
    hush_camera_handle.start(REC_MS);


}

export function
start_capture(status_el)
{

 console.log('statusel', status_el);

  var m = navigator.getUserMedia(
      CAPTURE_CONSTRAINTS,
      function (stream) { 
        status_el.stream = stream;
        capture_works(stream, status_el);
        console.log('stream: ', stream);
//        create_vu(stream, t);
      },
      e=>console.log('navigator.getUserMedia err:',e)
  );
}

async function do_test() {
  
  const status_el = document.getElementById('testdiv');
  let constraintList = document.getElementById("testdiv");
  let supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
/*
  for (let constraint in supportedConstraints) {
    if (supportedConstraints.hasOwnProperty(constraint)) {
      let elem = document.createElement("li");
      
      elem.innerHTML = "<code>" + constraint + "</code>";
      constraintList.appendChild(elem);
    }
  }
*/
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
  console.log("enumerateDevices() not supported.");
  return;
  }

  // List cameras and microphones.

  //FIXME: only have it enumerate mics / cams
  navigator.mediaDevices.enumerateDevices()
  .then(function(devices) {
    const select = document.createElement("select");

    select.appendChild(new Option('no media', undefined, true, true));

    devices.forEach(function(device) {
      select.appendChild(new Option(device.label, device, false, false));
      console.log(device.kind + ": " + device.label +
                  " id = " + device.deviceId);
    });
    let t = {};
    select.onchange = function(e) {
      console.log('The option with value ', e.target.value, ' and text ', e ,' was selected.');
      if (e.target.value != 'no media' ) {
        //FIXME: actually use the device the user choose
        start_capture(status_el);      
        console.log(t); 
      } else {
        console.log('stop capturing');
        console.log(select.m);
        if (status_el.stream) {
          console.log('we are capturing', status_el.stream);
          //status_el.stream.destroy();
          const tracks = status_el.stream.getTracks();

          tracks.forEach(function(track) {
            track.stop();
          });

        }
      }
    };
    status_el.appendChild(select);
    
  })
  .catch(function(err) {
    console.log(err.name + ": " + err.message);
  });



 // start_capture(status_el);
  
}
window.addEventListener("load", do_test());




