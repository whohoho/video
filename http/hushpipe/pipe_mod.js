'use strict';
import "./pipe-common.js";
export const name = 'audio';
// the type of datachannel this module wants

const TYPE = 'audio'

const CAPTURE_CONSTRAINTS = {audio: true};
const MIME = 'audio/webm;codecs=opus';
const REC_MS = 10;
const RECOPT = { 
        audioBitsPerSecond :  64000,
	      //videoBitsPerSecond : 2500000,
	      //bitsPerSecond:       2628000,
	      mimeType : MIME,
 	    };

let channel;
let encryptor;
let decryptor;
let rec_handle

function
record()
{
  async function camera_works(s){
      rec_handle = new MediaRecorder(s);
      rec_handle.ondataavailable = please_encrypt;
      rec_handle.start(REC_MS);
  }
  var m = navigator.getUserMedia(
      CAPTURE_CONSTRAINTS,
      camera_works,
      e=>warn('navigator.getUserMedia err:',e)
  );
}

function
new_feed(where, id)
{
   debug('getting feed: ', where, id);
    // id can be type of feed to? so video_high, video_low, audio, filereceiver, etc.
    if (! id.startsWith(NAME) ){
      warn("not implemented (in this module) feed: " + id);
      throw "feed type not implemented: "
    }
    if ( where.querySelector("#div_" + id) ) {
      console.log("existing feed, returning");
      console.log('this should be the feed div (id="'+ NAME +'")', where.querySelector("#div_"+id));
      return where.querySelector("#div_" + id);
    } else { // new feed
      // this is the div in the userdiv
      const div = document.createElement('div');
      div.setAttribute('id', "div_" + id);
      div.setAttribute('class', "div_video_high");
      let title = document.createElement('h1');
      title.textContent = "video_high: " + id;
      div.appendChild(title);
      const vid = document.createElement(TYPE);
      vid.setAttribute('id', id);
      div.appendChild(vid);

     let m_source = new MediaSource();
      m_source.addEventListener(
    'sourceopen',
    e => {
        console.log('m_source:sourceopen', e);
        /* TODO hardcoding the codec here sucks */
        vid.buf = m_source.addSourceBuffer(MIMETYPE);
    });
      vid.src = URL.createObjectURL(m_source);
      // FIXME: readonly property vid.buffered = false; /* TODO */

      where.appendChild(div);

    //vid.play();
    vid.autoplay = true;
    vid.controls = true;
      console.log('this should be the feed div (id="div_audio")', div)
      return div;
    }
}



// takes datachannel event + feed element (div with 1 video inside)
async function play_datachannel(evt, feed) {
	 //console.log("new video buffer: ", evt, feed);

   var uint8View = new Uint8Array(evt.data);
   play(uint8View, feed)
}

// takes encrypted uint8array + feed element (div with 1 video inside)
async function play(ciphertext, feed) {
   //console.log('encrypted: ', ciphertext, 'on feed: ' , feed); 
   let v = feed.getElementsByTagName(TYPE)[0];
  console.log('vid state: ', feed.parentElement.id , v.currentTime, v.buffered, v.currentSrc, v.duration, v.ended, v.error, v.networkState);

    try {
   var plain = await decrypt_uint8array(hush_key, ciphertext);
    } catch (err) {

      console.log('decryption failed (hush_play_video): ', err, ciphertext, feed);
      return;
    }

  const videl = feed.getElementsByTagName('video')[0]
    videl.buf.appendBuffer(plain);
	  videl.play();
}



// create a sender
// status_el , DOM element it can use to keep its status, display controls / status to user
// channel, a datachannel handle 
// encryptor, curried function it can use to encrypt
// parameters, implementation specific
export function create_sender(status_el, channel, encryptor) {
  create_observer(status_el);
  record();  
}

// create a receiver 
// status_el , DOM element it can use to keep its status, display controls / status to user
// channel, a datachannel handle (for receiving)
// decryptor, curried function it can use to encrypt
// parameters, implementation specific

export function create_receiver(user_el, channel, encryptor) {
  create_observer(user_el);
  
  const feed = new_feed(userEl, "audio");

  let curryplay = (feed) => (evt) => play_datachannel(evt, feed);

  channel.addEventListener("message", curryplay(feed));
  channel.addEventListener("open", console.log);
  channel.addEventListener("close", console.log);
}



