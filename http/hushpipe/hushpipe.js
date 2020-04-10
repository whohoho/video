/* Ask for fewer silent errors: */
'use strict';

import * as audiopipe from "./pipe_mod.js";
//import * as dc from "./datachannels.js";
import { create_sender } from "./pipe_mod.js";
import * as dc from "./datachannels.js";
import "./adapter.js";
import "./bundle.js";


let $ = a => document.querySelector(a);

let hush_key; /* Key used to encrypt/decrypt */
let hush_room; /* Room ID derived from master key */
let hush_camera_handle; /* Handle to MediaRecorder of our camera */
let hush_camera_loopback; /* <video> element display our own camera */
let gctx; /* TODO explain what this */

let hush_my_init_segment; /* Initialization segment of our own video feed */

const HUSH_CODEC = 'video/webm;codecs=vp8';

/*
 * TODO check out these APIs:
 * https://www.w3.org/TR/quota-api/ - get bigger allowance for local data
 * https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/getConstraints#Example - how to change camera
 */

async function
hush_read_key()
{
    try {
      const master_key = await get_master_key_from_url();
      const keys = await crypto_derive_from_master_key(master_key);
      console.log('keys',keys);
      hush_key = keys.e2e;
      hush_room = keys.room;
      $('#hush_room_key_label').innerText =
    '\nmaster key: ' + document.location.hash
    + '\n\nroom name: ' + keys.room;
   } catch (e) {
	  console.log('error reading room key', e);
     return false;
   }

    /*
     * Replace connection Janus
     */
    if (gctx) {
	gctx.session.destroy();
	try { clearInterval(gctx.debugInterval);
	    } catch(e){}
    }

   // encrypt_blob(key, blob)
    let encryptor = (key) => (blob) => encrypt_blob(key, blob);
  //decrypt_uint8array(key, buf)
    let decryptor = (key) => (buf) => decrypt_uint8array(key, buf);

    let ctx = {
    	user_id: new String(Math.floor(Math.random() * (1000000001))),
      session: null,
      publisher: null,
      subscribers: {},
      videoChannel: null,
      messages: [],
    	roomId: hush_room,
      key: hush_key,
      encryptor: encryptor(hush_key),
      decryptor: decryptor(hush_key),

    };

    console.log('crypt functions: ', ctx.encryptor, ctx.decryptor);

    gctx = ctx;
    dc.janus_connect(ctx, "ws://localhost:8188");
    return true;
}


/*
 * Callback handler for the hush_newroom button
 */
async function
hush_newroom()
{

  const senders = document.getElementById('myface');
  while (senders.firstChild) {
      // TODO: call a cleanup function on each sender
      console.log('removing all senders')
      senders.removeChild(senders.lastChild);
    }

     while (friends.firstChild) {
      // TODO: call a cleanup function on each friend
      console.log('removing all friends')
      friends.removeChild(friends.lastChild);
    }

    console.log('new master key');
    await crypto_new_master_key();
    console.log('new room key');
    hush_read_key();
}

// takes datachannel event + feed element (div with 1 video inside)
export async function hush_play_datachannel(evt, feed) {
	 //console.log("new video buffer: ", evt, feed);

   var uint8View = new Uint8Array(evt.data);
   hush_play_video(uint8View, feed)
}

async function
hush_append_buffer(video_element, plaintext)
{
    try {
	/* be optimistic */
	video_element.buf.appendBuffer(plaintext);
	return;
    } catch (e) {
	console.log('appendBufferfailed on',video_element, e);
	//video_element.play();
    }

    if (!video_element.buf) {
	console.log('this video element has no buf (are we in the process of making new?)', video_element);
	throw 'video has no buf';
    }
    if (video_element.buf.mode != 'segments')
	throw 'video is not segments WHAT\nx\nx\nx';
    if (video_element.buf.error) // then we should wait
	throw 'video is ERRORed WHAT\ngx\nx\nx';

    if (video_element.buf.updating){
	/*
	 * Technically speaking we should wait, instead we just drop frames
	 */
	video_element.buf.addEventListener('updateend', function () {
	    //try { video_element.buf.appendBuffer(plaintext);}catch(e){}
	}, { once: true, passive: true });
	return;
    }
    // maybe look at video_element.readyState

    try {
	video_element.buf.appendBuffer(plaintext);
    } catch (e) {
	console.log('appendBufferfailed on',video_element, e);
	//video_element.play();
    }
}

/*
 * takes encrypted uint8array + feed element (div with 1 video inside)
 * decrypts, adds the plaintext to the video buffer
 */
async function
hush_play_video(ciphertext, feed)
{
    //console.log('encrypted: ', ciphertext, 'on feed: ' , feed);
    const v = feed.getElementsByTagName('video')[0];
    console.log(
	`vid state: ${feed.parentElement.id} , v.currentTime:`,v.currentTime,
	`, v.buffered:`, v.buffered,
	`, v.currentSrc:${v.currentSrc}, v.duration:${v.duration}, v.ended:${v.ended}, v.error:`,
	v.error, `, v.networkState:${v.networkState}`);

    try {
	var plain = await decrypt_uint8array(hush_key, ciphertext);
    } catch (err) {
      console.log('decryption failed (hush_play_video): ', err, ciphertext, feed);
      return;
    }

    await hush_append_buffer(v, plain);
}

function
hush_camera_record()
{
  async function please_encrypt(blob_event){
      //console.log('xx', blob_event, await blob_event.data.arrayBuffer());
      var ciphertext = await encrypt_blob(hush_key, blob_event.data);
      try {
        gctx.videoChannel.send(ciphertext);
      } catch (err) { console.log('send failed: ', err) }
      
      //console.log('should send', ciphertext);
    
      //var plain = await decrypt_uint8array(hush_key, ciphertext);
      //console.log('plain', plain);
      if (hush_camera_loopback) {
	  //console.log(hush_camera_loopback);
	  //const preview = hush_camera_loopback.getElementsByTagName('video')[0]
    //preview.buf.appendBuffer(plain);
	  //preview.play();
      const userEl = dc.getUserEl("mine");
//  userEl.chan_video_high = highVideoChannel;
      //const feed = hush_new_feed(userEl, "video_high");
      const feed = hush_new_feed($('#myface'), "video_high");
/*
	   * TODO this is a little bit wasteful since we are decrypting
	   * our own payload, but this way we can check that our encryption
	   * worked as expected.
	   */

     await hush_play_video(ciphertext, feed)
      }
  }
  async function camera_works(s){
      console.log('s',s);
      //let svt = s.getVideoTracks()[0];

      hush_camera_loopback = hush_new_feed($('#myface'), "video_high");

      hush_camera_handle = new MediaRecorder(s, {
        codec: HUSH_CODEC, 
        audioBitsPerSecond: 160,
        videoBitsPerSecond: 160,

      });
      hush_camera_handle.mode = 'sequence';
      hush_camera_handle.ondataavailable = please_encrypt;
      hush_camera_handle.start(1000); /* TODO sample every n milliseconds */
  }
    let constraints = {
	video: {
   // width: { min: 240, ideal: 480, max: 500},
   // height: { min: 180, ideal: 360, max: 400},
      "height":{"exact":240},
      "width":{"exact":320},
	    frameRate: { ideal: 20, max: 25, } /* or just video:true*/
	    // facingMode: 'user' // use selfie-cam, !shoot-my-swimming-pool-cam
	},
	/* audio: {
	   noiseSuppression: true,
	   echoCancellation: true,
	   // sampleRate: 99999, /// Hz
	   //latency: 99.99, /// seconds
	}
	*/
    }
  
  var m = navigator.getUserMedia(
      constraints,
      camera_works,
      e=>console.log('navigator.getUserMedia err:',e)
  );
}

function
hush_camera_stop()
{
    try {
	hush_camera_handle.stop();
    } catch (e) {}
    const myface = $('#myface');
    while (myface.firstChild) {
	myface.removeChild(myface.lastChild);
    }
    hush_camera_loopback = null;
}

// id is the type of channel, its used in the classes / id's
export function
hush_new_pipe(where, id)
{
    console.log('creating dom element for channel',id, where);
    // check if 'where' (the roommate container) has already a element with the same feedtype  
    if ( where.querySelector("#div_" + id) ) {
      console.log("existing pipe, returning");
      console.log('this should be the pipe div (id="' + id + ' ")', where.querySelector("#div_"+id));
      return where.querySelector("#div_" + id);
    } else { // new feed
      // this is the div in the userdiv
      const div = document.createElement('div');
      div.setAttribute('id', "div_" + id);
      div.setAttribute('class', "div" + id);
      let title = document.createElement('h6');
      title.textContent = "pipe: " + id;
      div.appendChild(title);
      
      where.appendChild(div);


      return div;
    }
}

function
hush_camera_pause()
{
    try { hush_camera_handle.pause(); } catch (e) {}
}

function
hush_camera_resume()
{
    try { hush_camera_handle.resume(); } catch (e) {}
}

/*
 * Call with $('#friends') or $('#myface')
 */
export function
hush_new_feed(where, id)
{
    //FIXME, this is video specific, see hush_new_pipe above
    console.log('getting feed: ', where, id);
    // id can be type of feed to? so video_high, video_low, audio, filereceiver, etc.
    
    if (! id.startsWith("video_high") ){
      console.log("not implemented feed: " + id);
      throw "feed type not implemented: "
    }
    
    if ( where.querySelector("#div_" + id) ) {
      console.log("existing feed, returning");
      console.log('this should be the feed div (id="' + id + ' ")', where.querySelector("#div_"+id));
      return where.querySelector("#div_" + id);
    } else { // new feed
      // this is the div in the userdiv
      const div = document.createElement('div');
      div.setAttribute('id', "div_" + id);
      div.setAttribute('class', "div_video_high");
      let title = document.createElement('h1');
      title.textContent = "video_high: " + id;
      div.appendChild(title);
	const vid = document.createElement('video');
	vid.setAttribute('id', id);
	div.appendChild(vid);

	function set_source(video) {
	    let m_source = new MediaSource();
	    m_source.mode = 'segments';
	    m_source.addEventListener(
		'sourceopen',
		e => {
		    console.log('m_source:sourceopen', e);
		    /* TODO hardcoding the codec here sucks */
		    vid.buf = m_source.addSourceBuffer(HUSH_CODEC);
		}, {once: true, passive:true});
	    m_source.addEventListener(
		'sourceended', e => {
		    console.log('sourceended:', m_source, e);
		}, {once: true, passive:true});
	    video.src = URL.createObjectURL(m_source);
	}

	/*
	 * When it errors we try again:
	 */
	vid.addEventListener(
	    'error',
	    (e) => {
		console.log('new video source because video erred', vid);
		set_source(vid);
	    }, {once: true, passive:true});
	// FIXME: readonly property vid.buffered = false; /* TODO */

	/*
	 * Trigger error to make sure we have a source ready:
	 */
	set_source(vid);
	try { vid.play(); } catch (e){
	    console.log('play fail', vid, e);
	}

	where.appendChild(div);

	try { vid.play(); }
	catch(e){ console.log('vid.play() did not fly', vid); }
	vid.autoplay = true;
	vid.controls = true;
	console.log('this should be the feed div (id="div_video_high")', div)
      return div;
    }
}

async function
hush_onload()
{
    console.log('hushpipe \nTRY\nTRY\nTRY\nTRY\nTRY\nloading');

    $('#hush_newroom').onclick = hush_newroom;
    $('#hush_camera_record').onclick = hush_camera_record;
    $('#hush_camera_stop').onclick = hush_camera_stop;
    $('#hush_render_friends').onclick = hush_render_friends;
    $('#hush_camera_pause').onclick = hush_camera_pause;
    $('#hush_camera_resume').onclick = hush_camera_resume;

    /* Check if we already have a key: */
  	if (hush_read_key()) {
  	  console.log('cool we are in an existing room');
//      console.log('hush_key: ', gctx.key)
    } else {
    	console.log('failed reading key', e);
	    hush_newroom();
    }

    console.log('hushpipe \nOK\nOK\nOK\nOK\nOK\nOK\nloading');

    /*
     * Auto-play shit:
     */
    setInterval(
	() => document.querySelectorAll('video').forEach(e=> {
	    try {e.play();}catch(e){}
	})
	, 1000);

}

window.addEventListener("load", hush_onload());
