'use strict';

// https://www.darkcoding.net/software/reading-mediarecorders-webm-opus-output/
// https://github.com/GoogleChromeLabs/web-audio-samples/blob/master/audio-worklet/design-pattern/wasm/wasm-worklet-processor.js

function init () {
  document.querySelector('button').addEventListener('click', function() {
    console.log('clicked');
    audio_init();
  });
}
function usermedia_success( stream ) {
  console.log('stream success');
  const actx = new AudioContext();
  var instream = actx.createMediaStreamSource(stream);
//  var p =  actx.audioWorklet.addModule('https://localhost/hushpipe/opuswasm/opus-processor.js');
  var p =  actx.audioWorklet.addModule('https://localhost/hushpipe/opuswasm/ring-buffer-worklet-processor.js');


/* 
  const encoderNode = new AudioWorkletNode(actx, 'opus-processor');

  encoderNode.onmessage = function (msg) {
    console.log('encoded msg: ', msg); 
  };

  encoderNode.connect(actx.destination);

  instream.connect(encoderNode);
*/
} // usermedia success

  function err( e ) {
    console.log(e);
  };

async function audio_init () {
  navigator.webkitGetUserMedia({audio: true}, usermedia_success, err);
  
} // init


console.log('hello');
window.addEventListener("onload", init());
