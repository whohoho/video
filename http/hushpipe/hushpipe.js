/* Ask for fewer silent errors: */
'use strict';

import * as utils from "./utils.js";
//import * as audiopipe from "./pipe_mod.js";
//import * as dc from "./datachannels.js";
import { create_sender } from "./pipe_mod.js";
//import * as dc from "./datachannels.js";
import * as dc from "./ndc.js";

import "./adapter.js";
//import "./bundle.js";


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
export function hush_add_user(ctx, userId) {
  console.log("ctx in addUser: ", ctx);

  if (document.getElementById(userId)) {
    console.log('already known: ', userId);
    // user is already known
    return true;
  }
 
  console.info("Adding user " + userId + ".");
  const elem = hush_get_user_elem(userId);

}

export function hush_remove_user(ctx, userId) {
  console.info("Removing user " + userId + ".");

  // for debugging
  //const users = document.getElementById('friends');
  //console.log('user removed, users: ', users);
  if (! document.getElementById("hushpipe_user_" + userId)) {
    throw "user to remove is not there" ;
  }

  const userelem = hush_get_user_elem(userId);
  //userelem.destroy();
  userelem.parentNode.removeChild(userelem);

}

// create a DOM element for a user in the room, all state of that user is stored here
export function hush_get_user_elem(userId) {
  const elid = "hushpipe_user_" + userId;
  const users = document.getElementById('friends');
  //console.log(users);
  if (document.getElementById(elid)) {
    // user is already known
    return document.getElementById(elid);
  } else {  // user not seen before
    const user = document.createElement('fieldset');
    user.janus_user_id = userId;
    user.setAttribute('id', elid);
    user.setAttribute('class', 'friend_div');
    users.appendChild(user);
    let title = document.createElement('legend');
    title.textContent = userId;
    user.appendChild(title);
    return user;
  }

}


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
	gctx.janus_session.destroy();
	try { clearInterval(gctx.debugInterval);
	    } catch(e){}
    }

   // encrypt_blob(key, blob)
   let encryptor_blob = (key) => (blob) => encrypt_blob(key, blob);
   let encryptor = (key) => (blob) => encrypt(key, blob);

  //decrypt_uint8array(key, buf)
    let decryptor = (key) => (buf) => decrypt_uint8array(key, buf);
    let user_id = new String(Math.floor(Math.random() * (1000000001)));

    let ctx = {
    	user_id: user_id,
      nickname: user_id,
      session: null,
      publisher: null,
      subscribers: {},
      videoChannel: null,
      messages: [],
    	roomId: hush_room,
      key: hush_key,
      encryptor: encryptor(hush_key),
      encryptor_blob: encryptor_blob(hush_key),
      decryptor: decryptor(hush_key),

    };
    document.hush_key = hush_key;
    console.log('crypt functions: ', ctx.encryptor, ctx.decryptor);

    gctx = ctx;
    document.ctx = ctx;
    dc.janus_init(ctx);
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
      const div = document.createElement('fieldset');
      div.setAttribute('id', "div_" + id);
      div.setAttribute('class', "div" + id);
      let title = document.createElement('legend');
      title.textContent = "pipe: " + id;
      div.appendChild(title);
      
      where.appendChild(div);


      return div;
    }
}


async function
hush_onload()
{
    console.log('hushpipe \nTRY\nTRY\nTRY\nTRY\nTRY\nloading');
  /*
  try {
    //FIXME: this fails in firefox
    utils.find_media_devices();
  } catch (e) {
    console.log('error in find_media_devices', e);
  }
  try {
    utils.start_stream();
  } catch (e) { 
    console.log('error in start_stream when loading');
  }
  */
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

    // dom event listener
    var f = document.getElementById('friends');
    var m = document.getElementById('myface');

    function elemDel(evt) {
      console.log('elemdel: ', evt);
    }
    //f.addEventListener('DOMNodeRemoved', elemDel, false);
    //m.addEventListener('DOMNodeRemoved', elemDel, false);



    /*
     * Auto-play shit:
     */
    setInterval(
	() => document.querySelectorAll('video').forEach(e=> {
	    try {e.play();}catch(e){}
	})
	, 1000);

}

window.addEventListener("load", hush_onload);
