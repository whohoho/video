'use strict';
import { JitterBuffer, channelRingBuffer, HeapAudioBuffer, RingBuffer } from 'https://localhost/hushpipe/opuswasm/wasm-audio-helper.js';


//import * as test from "./opus.wasm.js";

// https://www.darkcoding.net/software/reading-mediarecorders-webm-opus-output/
// https://github.com/GoogleChromeLabs/web-audio-samples/blob/master/audio-worklet/design-pattern/wasm/wasm-worklet-processor.js

async function init () {

  await crypto_new_master_key(); 
  try {
      const master_key = await get_master_key_from_url();
      const keys = await crypto_derive_from_master_key(master_key);
      console.log('keys',keys);
      document.hush_key = keys.e2e;
      document.hush_room = keys.room;
   } catch (e) {
    console.log('error reading room key', e);
     return false;
   }

  document.querySelector('button').addEventListener('click', function() {
    console.log('clicked');
    audio_init();
  });
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
 
  // get a ref to the webassembly module
  const wasm = document.m;
  console.log(wasm);

  var iter = 0;

  //common
  const OpusBufferSize = 480;
  const OpusPacketSize = 1500; // 68 is actual size, padding is enabled

  // encoder 
  const encsize = wasm._getEncoderSize();
  const enc = wasm._malloc(encsize);
  console.log('init encoder: ', wasm._initEnc(enc));
  //ringbuffer to match audiocontext frame size with opus frame size
  const iRB = new channelRingBuffer(480, 1);
  const iH =  new HeapAudioBuffer(wasm, 480, 1);

  //decoder 
  const decsize = wasm._getDecoderSize();
  const dec = wasm._malloc(decsize);
  console.log('init decoder: ', wasm._initDec(dec));
  const oRB = new channelRingBuffer(480, 1);
  const oH = new HeapAudioBuffer(wasm, 480, 1);
  const JB = new JitterBuffer();
  const PDpointer = wasm._malloc(OpusPacketSize);
  const PDab = wasm.HEAP8.subarray(PDpointer,PDpointer + OpusPacketSize);
      
  //console.log(iH, oH);
  var seq = 98375773;
  encoderNode.onaudioprocess = async function(audioProcessingEvent) {
    //for debugging 
    iter += 1;
    
    var inputBuffer = audioProcessingEvent.inputBuffer;
    var outputBuffer = audioProcessingEvent.outputBuffer;

    iRB.push(inputBuffer.getChannelData(0));
    //console.log(iRB.framesAvailable);
    
    // Process only if we have enough frames for the encoder (480)
    if (iRB.framesAvailable >= OpusBufferSize) {
      //console.log(iH._channelData[0][0]);
      iRB.pull(iH.getChannelData(0));

      //FIXME: if we have to copy the packet later anyway, then this is not needed
      const packet = wasm._malloc(OpusPacketSize);
      const encret = wasm._encode(enc, iH.getHeapAddress(), packet);
      //console.log(encret);
      if ( encret < 0 ) {
        console.log('encode error: ', encret);
      }
      
     
     // console.log('ret, packet: ', ret, packet);
     const packetv = wasm.HEAP8.subarray(packet, packet + OpusPacketSize);
    //console.log(packetv);
    try {
    var ciphertext = await encrypt(document.hush_key, packetv);
    } catch (e) {
      console.log('encryption failed', e);
    }
    
    wasm._free(packet);
    seq += 1;
    //---- > here is where the packet gets send 
  
    try {  
      var decrypted = await decrypt_uint8array(document.hush_key, ciphertext);
      //FIXME: figure out how to store this immediately in the heap
    } catch (e) {
      console.log('decryption failed', e);
    }
    //console.log('orig / decrypted', packetv, new Int8Array(decrypted));
    //-------> we have a decrypted packet
    // FIXME: figure out how to detect frame drops: 
      // https://dxr.mozilla.org/mozilla-central/source/dom/media/webaudio/ScriptProcessorNode.cpp#133
      // https://padenot.github.io/web-audio-perf/
      // https://developer.mozilla.org/en-US/docs/Web/API/Performance
    // now put it in jitterbuffer
    if ( iter % 10 == 0 )
    {
      // simulate packet drop
    } else {
      JB.push (seq, decrypted);
    }

    /*
    if ( iter % 44 == 0 )
    {
     // simulate late (actually duplicated), and eventually wrong packet for seq
      JB.push(seq - 123, decrypted);
    }
*/
    //JB.push(seq, decrypted);
    var toplay = JB.pop();

    if (toplay == null) {
      const decret = wasm._decode(dec, 0, 0, oH.getHeapAddress());
      if ( decret < 0 ) {
        console.log('silence decode error: ', decret, encret);
      } 
    } else { //there is a packet to play
     
      PDab.set(new Uint8Array(toplay))
            //FIXME 1500 should be opus length
      const decret = wasm._decode(dec, PDpointer, OpusPacketSize, oH.getHeapAddress());
      if ( decret < 0 ) {
        console.log('packet decode error: ', decret, encret, PDab, toplay, PDpointer);
      }
    } 

      oRB.push(oH.getChannelData(0));
    }

    oRB.pull(outputBuffer.getChannelData(0));

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
