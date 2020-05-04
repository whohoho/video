'use strict';
import { 
  destroy_sender, 
  destroy_receiver, 
  cleanup, 
  DATACHAN_CONF,
  common_create_sender,
  common_create_receiver,
//  DEFAULTS,
} from "./pipe-common.js";

import * as pc from "./pipe-common.js";
import { capture_works, play_datachannel } from './vp.js';
import * as utils from "./utils.js";
export const DEFAULTS = pc.DEFAULTS;
export const NAME = 'audio';

// for opus
import { JitterBuffer, channelRingBuffer, HeapAudioBuffer, RingBuffer } from './opuswasm/wasm-audio-helper.js';

async function receive(t, data, seq ) {

  console.log('receive: ', t, data, seq);
  
  try {
  var decrypted = await decrypt_uint8array(document.hush_key, buf); 
  } catch (e) {
    console.log('decryption failed', e);
  }
  
  t.JB.push (seq, decrypted);

  //console.log('pt', plaintest);


}

async function send (t, packetv, seq, packet) {
  //console.log(packetv, seq);
  
  //console.log('encr: ', t.encryptor); 
    try {
      var ciphertext = await encrypt(document.hush_key, packetv, seq);
    } catch (e) {
      console.log('encryption failed', e);
    }
      try {
       /* 
        debug('chan in please_encrypt: \n chan: ', t.channel, 
              '\ncrypter: ', t.encryptor, 
              '\ncyphertext: ', ciphertext, 
              '\ndata: ', blob_event.data);
              */
        switch(t.channel.readyState) {
            case "connecting":
              break;
            case "open":
              //console.log('.');
              t.channel.send(ciphertext);
              break;
            case "closing":
              console.log("Attempted to send message while closing: " , blob_event);
              break;
            case "closed":
              console.log("Error! Attempt to send while connection closed.", blob_event);
              blob_event.srcElement.stop();
              break; 
        }

      } catch (err) { console.log('send failed: ', err) }

  
  t.wasm._free(packet);
  
}


function encode (audioProcessingEvent, t) {
  //for debugging 
  t.iter += 1;

  var inputBuffer = audioProcessingEvent.inputBuffer;

  t.iRB.push(inputBuffer.getChannelData(0));
  //console.log(iRB.framesAvailable);

  // Process only if we have enough frames for the encoder (480)
  if (t.iRB.framesAvailable >= t.OpusBufferSize) {
    //console.log(iH._channelData[0][0]);
    t.iRB.pull(t.iH.getChannelData(0));

    //FIXME: if we have to copy the packet later anyway, then this is not needed
    const packet = t.wasm._malloc(t.OpusPacketSize);
    const encret = t.wasm._encode(t.enc, t.iH.getHeapAddress(), packet);
    //console.log(encret);
    if ( encret < 0 ) {
      console.log('encode error: ', encret);
    }

    //console.log('ret, packet: ', ret, packet);
    const packetv = t.wasm.HEAP8.subarray(packet, packet + t.OpusPacketSize);
    send(t, packetv, t.seq, packet);
    t.seq += 1;
    //---- > here is where the packet gets send 
  }
}

function ladecode (audioProcessingEvent, t) {
  var outputBuffer = audioProcessingEvent.outputBuffer;

  /*
    try {  
      var decrypted = await decrypt_uint8array(document.hush_key, ciphertext);
      //FIXME: figure out how to store this immediately in the heap
    } catch (e) {
      console.log('decryption failed', e);
    }
    */
    //console.log('orig / decrypted', packetv, new Int8Array(decrypted));
    //-------> we have a decrypted packet
    // FIXME: figure out how to detect frame drops: 
    // https://dxr.mozilla.org/mozilla-central/source/dom/media/webaudio/ScriptProcessorNode.cpp#133
    // https://padenot.github.io/web-audio-perf/
    // https://developer.mozilla.org/en-US/docs/Web/API/Performance
    // now put it in jitterbuffer

      var toplay = t.JB.pop();
      //console.log(t);
      if (toplay == null) {
        const decret = t.wasm._decode(t.dec, 0, 0, t.oH.getHeapAddress());
        if ( decret < 0 ) {
          console.log('silence decode error: ', decret, encret);
        } 
      } else { //there is a packet to play

        PDab.set(new Uint8Array(toplay))
        //FIXME 1500 should be opus length
        const decret = t.wasm._decode(t.dec, t.PDpointer, t.OpusPacketSize, t.oH.getHeapAddress());
        if ( decret < 0 ) {
          console.log('packet decode error: ', decret, encret, PDab, toplay, t.PDpointer);
        }
      } 

    t.oRB.push(t.oH.getChannelData(0));
  

  t.oRB.pull(outputBuffer.getChannelData(0));

}

async function create_decoder(t) {
  console.log('creating opus decoder');

  //common
  const OpusBufferSize = 480;
  const OpusPacketSize = 1500; // 68 is actual size, padding is enabled

  //decoder 
  t.decsize = t.wasm._getDecoderSize();
  t.dec = t.wasm._malloc(t.decsize);
  console.log('init decoder: ', t.wasm._initDec(t.dec));
  t.oRB = new channelRingBuffer(480, 1);
  t.oH = new HeapAudioBuffer(t.wasm, 480, 1);
  t.JB = new JitterBuffer();
  t.PDpointer = t.wasm._malloc(OpusPacketSize);
  t.PDab = t.wasm.HEAP8.subarray(t.PDpointer,t.PDpointer + t.OpusPacketSize);
 
  var decoderNode = t.actx.createScriptProcessor(256, 1, 1);

  decoderNode.onaudioprocess = function (evt) { ladecode(evt, t); } ;
  decoderNode.connect(t.actx.destination);

  t.decoderNode = decoderNode;
    t.channel.onmessage =  function (evt) {
      console.log('.,');
   // console.log('got message', evt, evt.data.seq);
    //  receive(t, evt.data.data, evt.data.seq);
  };

  console.log('chan: ', t.channel); 


  

}

async function create_encoder(t) {
    // get a ref to the webassembly module
  t.wasm = document.m;

  t.iter = 0;

  //common
  t.OpusBufferSize = 480;
  t.OpusPacketSize = 1500; // 68 is actual size, padding is enabled

  // encoder 
  t.encsize = t.wasm._getEncoderSize();
  t.enc = t.wasm._malloc(t.encsize);
  console.log('init encoder: ', t.wasm._initEnc(t.enc));
  //ringbuffer to match audiocontext frame size with opus frame size
  t.iRB = new channelRingBuffer(480, 1);
  t.iH =  new HeapAudioBuffer(t.wasm, 480, 1);

  var encoderNode = await t.actx.createScriptProcessor(256, 1, 1);
  encoderNode.onaudioprocess = function (evt) {
    //console.log('wtf', evt); 
    encode(evt, t); } ;
  t.encoderNode = encoderNode;

  t.instream.connect(t.encoderNode);
  encoderNode.connect(t.actx.destination);

  console.log(t.encoderNode);


}

async function setup_actx_record(t) {
  const actx = new AudioContext({
  latencyHint: 'interactive',
  sampleRate: 48000,
});
  var s = await utils.start_stream();
  var instream = actx.createMediaStreamSource(s);
  t.actx = actx;
  t.instream = instream;
}

async function setup_actx_play(t) {
  const actx = new AudioContext({
  latencyHint: 'interactive',
  sampleRate: 48000,
});
  t.actx = actx;
}


// create a sender
// status_el , DOM element it can use to keep its status, display controls / status to user
// encryptor, curried function it can use to encrypt
export async function create_sender(status_el, channel_name, peerconn , encryptor, decryptor) {
  console.log('creating sender: ', channel_name);
  const channel = peerconn.createDataChannel(channel_name, DATACHAN_CONF );

  const t = {
    seq: 0,
    iter: 0,
    c: DEFAULTS,
    NAME: NAME,
    log: console.log,
    elem: status_el,
    encryptor: encryptor,
    decryptor: decryptor,
    channel: channel, 
    channel_name: channel_name,
    peerconn: peerconn,
  };
  console.log('t', t); 

  // get a ref to the webassembly module
  t.wasm = document.m;


  common_create_sender(t);

  var s = await utils.start_stream();
  console.log('stream: ', s, t);
  //capture_works(s, t);  

  await setup_actx_record(t);
  await create_encoder(t);
  console.log('encoder created!', t.actx, t.instream);
  utils.formel('range', t.elem, NAME + '_sender_volume', function () { return; } );  

}

function mute_sender(t) {

  return;
}


// create a receiver 
// status_el , DOM element it can use to keep its status, display controls / status to user
// decryptor, curried function it can use to encrypt
export async function create_receiver(pipe_el, channel_name, peerconn ,decryptor) {
   console.log('creating receiver: ', channel_name);

  const channel = peerconn.createDataChannel(channel_name, DATACHAN_CONF );
  
  const t = {
    iter: 0,
    c: DEFAULTS,
    NAME: NAME,  
    log: console.log,
    elem: pipe_el,
    decryptor: decryptor,
    channel: channel, 
    channel_name: channel_name,
    peerconn: peerconn,
  };
  // get a ref to the webassembly module
  t.wasm = document.m;


  common_create_receiver(t);
  await setup_actx_play(t);
  await create_decoder(t);

  utils.formel('range', t.elem, NAME + '_receiver_volume', function () {
  return; 
  });

 
  }



