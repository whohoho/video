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

/*
 * TODO check out these APIs:
 * https://www.w3.org/TR/quota-api/ - get bigger allowance for local data
 */

function
hush_render_friends(mouseevent)
{
  console.log("rendering friends: ", gctx);
}


async function
hush_read_key()
{
//    try {
    const master_key = await get_master_key_from_url();
    const keys = await crypto_derive_from_master_key(master_key);
    console.log('keys',keys);
    hush_key = keys.e2e;
    hush_room = keys.room;
    $('#hush_room_key_label').innerText =
	'\nmaster key: ' + document.location.hash
	+ '\n\nroom name: ' + keys.room;
  //  } catch (e) {
//	console.log('error reading room key', e);
  //  }
}


/*
 * Callback handler for the hush_newroom button
 */
async function
hush_newroom()
{
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

// takes encrypted uint8array + feed element (div with 1 video inside)
async function hush_play_video(ciphertext, feed) {
   //console.log('encrypted: ', ciphertext, 'on feed: ' , feed); 
   let v = feed.getElementsByTagName('video')[0];
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

      hush_play_video(ciphertext, feed)
      }
  }
  async function camera_works(s){
      console.log('s',s);
      //let svt = s.getVideoTracks()[0];

      hush_camera_loopback = hush_new_feed($('#myface'), "video_high");

      hush_camera_handle = new MediaRecorder(s);
      hush_camera_handle.ondataavailable = please_encrypt;
      hush_camera_handle.start(1000);
  }
  var m = navigator.getUserMedia(
      {video:true},
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

/*
 * Call with $('#friends') or $('#myface')
 */
export function
hush_new_feed(where, id)
{
    console.log('getting feed: ', where, id);
    // id can be type of feed to? so video_high, video_low, audio, filereceiver, etc.
    if (! id.startsWith("video_high") ){
      console.log("not implemented feed: " + id);
      throw "feed type not implemented: "
    }
    if ( where.querySelector("#div_" + id) ) {
      console.log("existing feed, returning");
      console.log('this should be the feed div (id="div_video_high")', where.querySelector("#div_"+id));
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

     let m_source = new MediaSource();
      m_source.addEventListener(
    'sourceopen',
    e => {
        console.log('m_source:sourceopen', e);
        /* TODO hardcoding the codec here sucks */
        vid.buf = m_source.addSourceBuffer('video/webm;codecs=vp8');
    });
      vid.src = URL.createObjectURL(m_source);
      // FIXME: readonly property vid.buffered = false; /* TODO */

      where.appendChild(div);

    //vid.play();
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

    /* Check if we already have a key: */
    try {
	hush_read_key();
	console.log('cool we are in an existing room');
    } catch (e) {
	console.log('failed reading key', e);
	hush_newroom();
    }

    let ctx = {
	user_id: new String(Math.floor(Math.random() * (1000000001))),
      session: null,
      publisher: null,
      subscribers: {},
      videoChannel: null,
      messages: [],
      roomId: "42",

    };
    gctx = ctx;
    dc.janus_connect(ctx, "ws://localhost:8188");



    console.log('hushpipe \nOK\nOK\nOK\nOK\nOK\nOK\nloading');

    setInterval(10, hush_render_friends(ctx));
  console.log('wtf');

}

window.addEventListener("load", hush_onload());
export default hush_onload
