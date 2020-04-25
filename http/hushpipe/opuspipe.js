'use strict';
import "./pipe-common.js";
import * as mediaplayer from "./pipe-common.js";
import * as utils from "./utils.js";
export const NAME = 'opus';
const isDebug = true

if (isDebug) var debug = console.log.bind(window.console)
else var debug = function(){}

var warn = console.log.bind(window.console)


const TYPE = 'opus'

const CAPTURE_CONSTRAINTS = {audio: true};
const MIMETYPE = 'audio/webm;codecs=opus';
const REC_MS = 10;
const RECOPT = { 
        audioBitsPerSecond :  64000,
	      //videoBitsPerSecond : 2500000,
	      //bitsPerSecond:       2628000,
	      mimeType : MIMETYPE,
 	    };

function
record(t)
{
  async function capture_works(s, t){
      const rec_handle = new MediaRecorder(s);
      rec_handle.ondataavailable = function (data) { 
//        console.log('audiorecord callback ', data);
        utils.please_encrypt(data, t); 
      }
      rec_handle.start(REC_MS);
  }
  var m = navigator.getUserMedia(
      CAPTURE_CONSTRAINTS,
      function (stream) { 
        capture_works(stream, t);
        utils.create_vu(stream, t);

      },
      e=>warn('navigator.getUserMedia err:',e)
  );
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

      console.log('decryption failed (hush_play): ', err, ciphertext, t.pipe_el);
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
export function create_sender(status_el, channel, encryptor) {

  // local log
  let loge = document.createElement('pre');
  status_el.appendChild(loge);

  function log (msg)  {
    for (var i = 0, j = arguments.length; i < j; i++){
       // var txt = document.createTextNode(arguments[i]+' ');
       // loge.appendChild(txt);
        var alltext =alltext + arguments[i]+ ' -- ';
    }
    var br = document.createTextNode(alltext + "\n");
    loge.appendChild(br);
  }

  // datachannel stats
   let cstats = document.createElement('pre');
  var br = document.createTextNode(" stats here\n");
  cstats.appendChild(br);
  status_el.appendChild(cstats);
  window.setInterval(utils.rendercstats(cstats, channel), 2000);
 
  //let log = (status_el) => (msg) => local_log(status_el, msg);
  
  const t = {
    log: log,
    status_el: status_el,
    encryptor: encryptor,
    channel: channel,
    status_el: status_el,
  };
  log('chan in create_sender: ', channel, t);
  log('cryp in create_sender: ', encryptor);

  let title = document.createElement('legend');
  title.textContent = NAME;
  status_el.appendChild(title);


//  create-observer(status_el);
  record(t);  
}

// create a receiver 
// status_el , DOM element it can use to keep its status, display controls / status to user
// channel, a datachannel handle (for receiving)
// decryptor, curried function it can use to encrypt
export function create_receiver(pipe_el, channel, decryptor) {
  // local log
  let loge = document.createElement('pre');
  pipe_el.appendChild(loge);

  function log (msg)  {
    for (var i = 0, j = arguments.length; i < j; i++){
       // var txt = document.createTextNode(arguments[i]+' ');
       // loge.appendChild(txt);
        var alltext =alltext + arguments[i]+ ' -- ';
    }
    var br = document.createTextNode(alltext + "\n");
    loge.appendChild(br);
  }

  const t = {
    log: log,
    pipe_el: pipe_el,
    decryptor: decryptor,
    channel: channel,
    buffer: undefined, 
    queue: [], // put shit that can't be played now

  };
  debug('chan in create_receiver: ', channel, t);
  debug('cryp in create_receiver: ', decryptor, t);

  //create_observer(pipe_el);
  
  let title = document.createElement('legend');
  title.textContent = NAME;
  pipe_el.appendChild(title);

  channel.addEventListener("open", console.log);
  channel.addEventListener("close", console.log);

 }



