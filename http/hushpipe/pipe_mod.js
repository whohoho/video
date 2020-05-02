'use strict';
import "./pipe-common.js";
import * as mediaplayer from "./pipe-common.js";
import * as utils from "./utils.js";
export const NAME = 'audio';
const isDebug = true

if (isDebug) var debug = console.log.bind(window.console)
else var debug = function(){}

var warn = console.log.bind(window.console)

const DATACHAN_CONF = {
  ordered: false, 
  maxRetransmits: 0,
//  maxPacketLifeTime: null,
  protocol: "",
//  negotiated: false,
};



const TYPE = 'audio'

const MIMETYPE = 'audio/webm;codecs=opus';
const REC_MS = 10;
const RECOPT = { 
        audioBitsPerSecond :  64000,
	      //videoBitsPerSecond : 2500000,
	      //bitsPerSecond:       2628000,
	      mimeType : MIMETYPE,
 	    };

async function capture_works(s, t){
      if (t.rec_handle) {
        console.log('already got a recorder, recreating it');
        t.rec_handle.stop();
        t.rec_handle = undefined;
      };
      rec_handle = new MediaRecorder(s);
      t.rec_handle = rec_handle;
      t.rec_handle.ondataavailable = function (data) { 
//        console.log('audiorecord callback ', data);
        utils.please_encrypt(data, t); 
      }
      t.rec_handle.start(REC_MS);
  }

// takes datachannel event + feed element (div with 1 video inside)
async function play_datachannel(evt, t) {
//	 console.log("new audio buffer: ", evt, t);

   var uint8View = new Uint8Array(evt.data);
   play(uint8View, t)
}

// takes encrypted uint8array + feed element (div with 1 video inside)
async function play(ciphertext, t) {
  // console.log('encryptee: ', ciphertext, 'on feed: ' , t.pipe_el); 
  // let v = t.pipe_el.getElementsByTagName(TYPE)[0];
  //console.log('audio state: ', t.pipe_el.parentElement.id , v.currentTime, v.buffered, v.currentSrc, v.duration, v.ended, v.error, v.networkState);

    try {
   var plain = await t.decryptor(ciphertext);
    } catch (err) {

      console.log('decryption failed (hush_play): ', err, ciphertext, t.elem);
      return;
    }
    if (t.buffer) {
      if (t.buffer.updating || t.queue.length > 0) {
        t.queue.push(plain);
      } else {
        t.buffer.appendBuffer(plain);
      }
    }
}



// create a sender
// status_el , DOM element it can use to keep its status, display controls / status to user
// channel, a datachannel handle 
// encryptor, curried function it can use to encrypt
export async function create_sender(status_el, channel_name, peerconn , encryptor) {

  const channel = peerconn.createDataChannel(channel_name, DATACHAN_CONF );

  const t = {
    log: console.log,
    elem: status_el,
    encryptor: encryptor,
    channel: channel, 
    channel_name: channel_name,
    peerconn: peerconn,
  };
  console.log('t', t); 

  utils.formel('checkbox', t.elem, NAME + '_sender_close', function () { destroy_sender(t); });
  utils.formel('checkbox', t.elem, NAME + '_sender_mute', function () { mute_sender(t); });
  utils.formel('range', t.elem, NAME + '_sender_volume', function () { return; } );

  // datachannel stats  
  let cstats = document.createElement('pre');
  var br = document.createTextNode(" stats here\n");
  cstats.appendChild(br);
  t.elem.appendChild(cstats);
  window.setInterval(function () { utils.rendercstats(cstats, t.channel); }, 2000);

  let title = document.createElement('legend');
  title.textContent = NAME + "_sender";
  t.elem.appendChild(title);

  var s = await utils.start_stream();
  console.log('stream: ', s, t);
  capture_works(s, t);  
}

function cleanup(t) {
 console.log('datachannel was closed', t.channel);
 if (t.elem != undefined) {
  t.elem.parentNode.removeChild(t.elem);
 } else {
  console.log('t.elem: ', t.elem);
 }
}

function destroy_receiver(t) {
  console.log('destroying receiver');
  t.channel.close();
  console.log('chan: ', t.channel);
  cleanup(t)
}

function destroy_sender(t) {
  console.log('destroying sender');
  t.channel.close();
  console.log('chan: ', t.channel);
  cleanup(t)
}


// create a receiver 
// status_el , DOM element it can use to keep its status, display controls / status to user
// decryptor, curried function it can use to encrypt
export function create_receiver(pipe_el, channel_name, peerconn ,decryptor) {
 
  const channel = peerconn.createDataChannel(channel_name, DATACHAN_CONF );

  const t = {
    log: console.log,
    elem: pipe_el,
    decryptor: decryptor,
    channel: channel, 
    channel_name: channel_name,
    peerconn: peerconn,
  };

  // datachannel stats  
  let cstats = document.createElement('pre');
  var br = document.createTextNode("");
  cstats.appendChild(br);
  t.elem.appendChild(cstats);
  window.setInterval(function () { utils.rendercstats(cstats, t.channel); }, 2000);


  console.log('t', t); 
  t.channel.addEventListener("close", function () { destroy_receiver(t) });
  t.channel.addEventListener("closing", function () { destroy_receiver(t) });
  t.elem.destroy = function () { destroy_receiver(t) };

  utils.formel('checkbox', t.elem, NAME + '_receiver_close', function () { destroy_receiver(t); });
  utils.formel('checkbox', t.elem, NAME + '_receiver_mute', function () { destroy_receiver(t); });
  utils.formel('range', t.elem, NAME + '_receiver_volume', function () {
    //FIXME volume 
    return; 
  });

 
  let title = document.createElement('legend');
  title.textContent = NAME + "_receiver";
  t.elem.appendChild(title);

 }



