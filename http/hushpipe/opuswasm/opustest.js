'use strict';

//import * as test from "./opus.wasm.js";

// https://www.darkcoding.net/software/reading-mediarecorders-webm-opus-output/
// https://github.com/GoogleChromeLabs/web-audio-samples/blob/master/audio-worklet/design-pattern/wasm/wasm-worklet-processor.js

function init () {
/*
(async () => {
  const response = await fetch('opus.wasm');
  const module = await WebAssembly.compileStreaming(response);
  const instance = await WebAssembly.instantiate(module);
  const result = instance.exports.fibonacci(42);
  console.log(result);
})();

*/

  document.querySelector('button').addEventListener('click', function() {
    console.log('clicked');
    audio_init();
  });
}
function audioprocess (evt) {
    var inputBuffer = evt.inputBuffer;
    var outputBuffer = evt.outputBuffer;

    // Loop through the output channels (in this case there is only one)
    for (var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
      var inputData = inputBuffer.getChannelData(channel);
      var outputData = outputBuffer.getChannelData(channel);
      
      console.log(inputData);

      // Loop through the 4096 samples
      for (var sample = 0; sample < inputBuffer.length; sample++) {
        // make output equal to the same as the input
        outputData[sample] = inputData[sample];

        // add noise to each output sample
        outputData[sample] += ((Math.random() * 2) - 1) * 0.2;         
      }
    }
  }



function usermedia_success( stream ) {
  console.log('stream success');
  const actx = new AudioContext();
  var instream = actx.createMediaStreamSource(stream);

/* ----- audioworklet is not working in firefox, using scriptprocessor for now
//  var p =  actx.audioWorklet.addModule('https://localhost/hushpipe/opuswasm/opus-processor.js');
  var p =  actx.audioWorklet.addModule('https://localhost/hushpipe/opuswasm/ring-buffer-worklet-processor.js');

  const encoderNode = new AudioWorkletNode(actx, 'opus-processor');

  encoderNode.onmessage = function (msg) {
    console.log('encoded msg: ', msg); 
  };
------------------------  */

 
  
  encoderNode.connect(actx.destination);

  instream.connect(encoderNode);
} // usermedia success

  function err( e ) {
    console.log(e);
  };

async function audio_init () {
  navigator.webkitGetUserMedia({audio: true}, usermedia_success, err);
  
} // init


console.log('hello');
window.addEventListener("onload", init());
