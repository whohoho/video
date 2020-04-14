'use strict';
import { channelRingBuffer, HeapAudioBuffer, RingBuffer } from 'https://localhost/hushpipe/opuswasm/wasm-audio-helper.js';


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
var encoderNode = actx.createScriptProcessor(256, 1, 1);
  
  const wasm = document.m;
  console.log(wasm);

  // alloc memory for the encoder state
  const encsize = wasm._getEncoderSize();
  const enc = wasm._malloc(encsize);

  const decsize = wasm._getDecoderSize();
  const dec = wasm._malloc(decsize);


  console.log('init encoder: ', wasm._initEnc(enc));
  console.log('init decoder: ', wasm._initDec(dec));


  const iRB = new channelRingBuffer(480, 1);
  const oRB = new channelRingBuffer(480, 1);
  const iH =  new HeapAudioBuffer(wasm, 480, 1);
  const oH = new HeapAudioBuffer(wasm, 480, 1);
  //console.log(iH, oH);
  const OpusBufferSize = 480;

  encoderNode.onaudioprocess = function(audioProcessingEvent) {
    ///
    var inputBuffer = audioProcessingEvent.inputBuffer;
    var outputBuffer = audioProcessingEvent.outputBuffer;
/*
      for (var sample = 0; sample < inputBuffer.length; sample++) {
        // make output equal to the same as the input
//        outputBuffer.getChannelData(0)[sample] = inputBuffer.getChannelData(0)[sample];
        // add noise to each output sample
        inputBuffer.getChannelData(0)[sample] += ((Math.random() * 2) - 1) * 0.2;         
      }
*/ 
    iRB.push(inputBuffer.getChannelData(0));
    //console.log(iRB.framesAvailable);
    
    // Process only if we have enough frames for the encoder (480)
    if (iRB.framesAvailable >= OpusBufferSize) {
      //console.log(iH._channelData[0][0]);
      iRB.pull(iH.getChannelData(0));
      const packet = wasm._malloc(1500);
      const encret = wasm._encode(enc, iH.getHeapAddress(), packet);
      if ( encret < 0 ) {
        console.log('encode error: ', encret);
      }
      
      const decret = wasm._decode(dec, packet, encret, oH.getHeapAddress());
      if ( decret < 0 ) {
        console.log('decode error: ', decret, encret);
      }
      
     // console.log('ret, packet: ', ret, packet);
      // Do stuff (like encrypting the packet and sending it here )
      wasm._free(packet);
      oRB.push(oH.getChannelData(0));
    }

    // Loop through the samples
    /*
    console.log('oooo');
      for (var sample = 0; sample < inputBuffer.length; sample++) {
        // make output equal to the same as the input
       // outputBuffer.getChannelData(0)[sample] = inputBuffer.getChannelData(0)[sample];

        // add noise to each output sample
        outputBuffer.getChannelData(0)[sample] += ((Math.random() * 2) - 1) * 0.2;         
      }
        
    console.log(inputBuffer.getChannelData(0)[1], outputBuffer.getChannelData(0)[1]);
*/
    // play decoded to test
    oRB.pull(outputBuffer.getChannelData(0));
    /*
     for (var sample = 0; sample < inputBuffer.length; sample++) {
        // make output equal to the same as the input
//        outputBuffer.getChannelData(0)[sample] = inputBuffer.getChannelData(0)[sample];

        // add noise to each output sample
 //       outputBuffer.getChannelData(0)[sample] += ((Math.random() * 2) - 1) * 0.2;         
      }
 */ 

  }
 
 
  
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
