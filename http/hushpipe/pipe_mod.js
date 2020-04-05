'use strict';
import "./pipe-common.js";
export const NAME = 'audio';
// the type of datachannel this module wants

const isDebug = true

if (isDebug) var debug = console.log.bind(window.console)
else var debug = function(){}

var warn = console.log.bind(window.console)


const TYPE = 'audio'

const CAPTURE_CONSTRAINTS = {audio: true};
const MIMETYPE = 'audio/webm;codecs=opus';
const REC_MS = 10;
const RECOPT = { 
        audioBitsPerSecond :  64000,
	      //videoBitsPerSecond : 2500000,
	      //bitsPerSecond:       2628000,
	      mimeType : MIMETYPE,
 	    };

//let channel;
//let encryptor;
//let decryptor;
//let rec_handle;
//let t;

export async function please_encrypt(blob_event, t){
      //debug('chan in please_encrypt: ', t.channel, t.encryptor);
      try {
      var ciphertext = await t.encryptor(blob_event.data);
      } catch (err) { warn('encryption failed', err); }
      try {
        t.channel.send(ciphertext);
      } catch (err) { warn('send failed: ', err) }

  }

function create_vu(stream, t) {
      // vu meter
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    const javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

    analyser.smoothingTimeConstant = 0.3;
    analyser.fftSize = 1024;

    microphone.connect(analyser);
    analyser.connect(javascriptNode);
    javascriptNode.connect(audioContext.destination);
    
    const canvas = document.createElement('canvas');

    t.status_el.appendChild(canvas);

    const canvasContext = canvas.getContext("2d");
    javascriptNode.onaudioprocess = function() {
        var array =  new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);
        var values = 0;

        var length = array.length;
        for (var i = 0; i < length; i++) {
            values += array[i];
        }

        var average = values / length;
        canvasContext.clearRect(0, 0, 60, 130);
        canvasContext.fillStyle = '#00ff00';
        canvasContext.fillRect(0,130-average,25,130);
    }




}

function
record(t)
{
  async function capture_works(s, t){
      const rec_handle = new MediaRecorder(s);
      rec_handle.ondataavailable = function (data) { 
//        console.log('audiorecord callback ', data);
        please_encrypt(data, t); 
      }
      rec_handle.start(REC_MS);
  }
  var m = navigator.getUserMedia(
      CAPTURE_CONSTRAINTS,
      function (stream) { 
        capture_works(stream, t);
        create_vu(stream, t);

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

  let title = document.createElement('h1');
  title.textContent = "audiosender";
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
  
  let title = document.createElement('h1');
  title.textContent = "audioreceiver";
  pipe_el.appendChild(title);

  // create audioplayer
  const audio = document.createElement('audio');
  audio.autoplay = true;
  audio.controls = true;
    
  //audio.setAttribute('id', id);
  pipe_el.appendChild(audio);
  const me = audio;
  // create SourceBuffer for audio element
  if (! 'MediaSource' in window && MediaSource.isTypeSupported(MIME)) {
    console.log('unsupported format');
    throw "format not supported";
  }

    let mediaSource = new MediaSource();
    audio.src = window.URL.createObjectURL(mediaSource);
   

  ///...
  
  mediaSource.addEventListener('sourceclose', function(e) {
    console.log('source closed', e);
    var src = e.target;
    audio.src = undefined;
    let ms = new MediaSource();
    const newaudio = document.createElement('audio');
    newaudio.autoplay = true;
    newaudio.controls = true;
   
    newaudio.src = window.URL.createObjectURL(ms);
    audio.parentNode.replaceChild(newaudio, audio);

    audio.load();

  });
 

  mediaSource.addEventListener('sourceopen', function(e) {
    
   
   /* 
    var pp = audio.play();
    if (audio.play() !== undefined) {
    pp.then(_ => {
      console.log('now playing'); 
    })
    .catch(error => {
      console.log('play failed: ', error);
    });
    }
    */
    // check readystate
    if (!mediaSource.readyState == 'open') {
      console.log(mediaSource, mediaSource.readyState);
      throw "we are in the sourceopen function, but readystate is not open";
    } 

    const buffer = mediaSource.addSourceBuffer(MIMETYPE);
    buffer.mode = 'sequence';
    //t.buffer.addEventListener('updatestart', function(e) { console.log('updatestart: ' + mediaSource.readyState); });
    //t.buffer.addEventListener('update', function(e) { console.log('update: ' + mediaSource.readyState); });
    buffer.addEventListener('updateend', function(e) { 
      //mediaSource.endOfStream();
      //audio.play();
      console.log('>>>updateend: ' + mediaSource.readyState); 
    });
    buffer.addEventListener('error', function(e) { 
      buffer = undefined;
      console.log('error: ' + mediaSource.readyState, mediaSource, audio, buffer);
      window.setTimeout(1000, function () {
      let newSource = new MediaSource();
      audio.src = window.URL.createObjectURL(newSource);
      });

    });
    buffer.addEventListener('abort', function(e) { console.log('abort: ' + mediaSource.readyState); });
    buffer.addEventListener('update', function() { // Note: Have tried 'updateend'
      if (t.queue.length > 0 && !buffer.updating) {
        buffer.appendBuffer(queue.shift());
      }
    }); // buffer update eventlistener

     // we have sourcebuffer,  add eventlistener to datachannel, that put's buffers into the audioelement's sourcebuffer
      let curryplay = (t) => (evt) => play_datachannel(evt, t);
      channel.addEventListener("message", curryplay(t));

  }, false);

  mediaSource.addEventListener('sourceopen', function(e) { console.log('sourceopen: ' + mediaSource.readyState); });
  mediaSource.addEventListener('sourceended', function(e) { console.log('sourceended: ' + mediaSource.readyState); });
  mediaSource.addEventListener('sourceclose', function(e) { console.log('sourceclose: ' + mediaSource.readyState); });
  mediaSource.addEventListener('error', function(e) { 
    console.log('error: ' + mediaSource.readyState);
    /*
    console.log("audio Error " + audio.error.code + "; details: " + videoElement.error.message);
    audio.buf = m_source.addSourceBuffer(MIMETYPE);
    audio.buf.mode = 'sequence';
    */ 
  });

      ///....
  /*
  m_source.addEventListener("message", t.log('source ended'));
  m_source.addEventListener("open", t.log('source open'));
  
  m_source.addEventListener(
    'sourceopen',
    e => {
      t.log('m_source:sourceopen', e);
//      console.log('audio state: ', pipe_el.parentElement.id , v.currentTime, v.buffered, v.currentSrc, v.duration, v.ended, v.error, v.networkState);

      audio.onerror = function() {
          console.log("audio Error " + audio.error.code + "; details: " + videoElement.error.message);
          audio.buf = m_source.addSourceBuffer(MIMETYPE);
          audio.buf.mode = 'sequence';
 

      }
      audio.buf = m_source.addSourceBuffer(MIMETYPE);
      audio.buf.mode = 'sequence';
     
 
    });
    */

   channel.addEventListener("open", console.log);
  channel.addEventListener("close", console.log);

 }



