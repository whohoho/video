'use strict';
import * as audiopipe from "./pipe_mod.js";
import * as opuspipe from "./opuspipe.js";
import * as chat from "./chat.js";


//import { create_sender } from "./pipe_mod.js";

import { hush_new_feed, hush_new_pipe ,hush_play_datachannel } from "./hushpipe.js";

//FIXME
var janusconn;
var messages = [];

const DATACHAN_CONF = {
  ordered: false, 
  maxRetransmits: 0,
//  maxPacketLifeTime: null,
  protocol: "",
//  negotiated: false,
};

const PEER_CONNECTION_CONFIG = {
    iceServers: [
// TODO here we can add STUN servers
//    { urls: "stun:stun.l.google.com:19302" },
//    { urls: "stun:global.stun.twilio.com:3478?transport=udp" }
  ]
};

// deal with errors from janus
/*
function isError(signal) {
  console.log("janus error signal: ", signal);

  var isPluginError =
      signal.plugindata &&
      signal.plugindata.data &&
      signal.plugindata.data.success === false;
  return isPluginError || Minijanus.JanusSession.prototype.isError(signal);
}
*/

// connect to janus (the SFU server)
export function janus_connect(ctx, server) {
//  console.log("1 ctx in janus_connect: ", ctx);

  var ws = new WebSocket(server, "janus-protocol");
  var session = ctx.session = new Minijanus.JanusSession(ws.send.bind(ws), { verbose: true });
  // FIXME, what does this do?? // session.isError = isError;
  //

  // deal with websocket messages from janus
  function receiveMsg(session,ev) {
    session.receive(JSON.parse(ev.data))
  }
  ws.addEventListener("message", ev => receiveMsg(session,ev));

  ws.addEventListener("open", (socket) => {

    ctx.session.create()
    .then( function pub (something) {
        //console.log("ctx in janus_connect: ", ctx);
        attachPublisher(ctx);
    }).then(x => { ctx.publisher = x; }, err => console.error("Error attaching publisher: ", err));
  });
}

// create a DOM element for a user in the room, all state of that user is stored here
export function getUserEl(userId) {
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


function addUser(ctx, userId) {
  //console.log("ctx in addUser: ", ctx);

  if (document.getElementById(userId)) {
    // user is already known
    return true;
  }
 
  console.info("Adding user " + userId + ".");
  const elem = getUserEl(userId);

  return attachSubscriber(ctx, userId)
    .then(x =>   { ctx.subscribers[userId] = x; }, err => console.error("Error attaching subscriber: ", err));
}

function removeUser(ctx, userId) {
  console.info("Removing user " + userId + ".");

  // for debugging
  //const users = document.getElementById('friends');
  //console.log('user removed, users: ', users);
  if (! document.getElementById("hushpipe_user_" + userId)) {
    throw "user to remove is not there" ;
  }

  const userelem = getUserEl(userId);
  userelem.parentNode.removeChild(userelem);

  // FIXME: get rid of ctx.subscribers
  var subscriber = ctx.subscribers[userId];
  if (subscriber != null) {
    subscriber.handle.detach();
    subscriber.conn.close();
    delete ctx.subscribers[userId];
  }
}

function waitForEvent(name, handle) {
  return new Promise(resolve => handle.on(name, resolve));
}

function addExisting(conn, handle, debugmsg) {
conn.createOffer(
    {
      media: { addData: true },
        success: function(jsep) {
            Janus.debug(jsep);
        },
        error: function(error) {
            console.log("renegotiate error " + JSON.stringify(error));
        }
    }); 
}


function associate(conn, handle, debugmsg) {
  conn.addEventListener("icecandidate", ev => {
    handle.sendTrickle(ev.candidate || null).catch(e => console.error("Error trickling ICE: ", e));
  });
  conn.addEventListener("negotiationneeded", _ => {
    console.info("Sending new offer for handle: ", handle, debugmsg);
    var offer = conn.createOffer();
    var local = offer.then(o => conn.setLocalDescription(o));
    var remote = offer.then(j => handle.sendJsep(j)).then(r => conn.setRemoteDescription(r.jsep));
    Promise.all([local, remote]).catch(e => console.error("Error negotiating offer: ", e));
  });
  handle.on("event", ev => {
    if (ev.jsep && ev.jsep.type == "offer") {
      console.info("Accepting new offer for handle: ", handle, debugmsg);
      var answer = conn.setRemoteDescription(ev.jsep).then(_ => conn.createAnswer());
      var local = answer.then(a => conn.setLocalDescription(a));
      var remote = answer.then(j => handle.sendJsep(j));
      Promise.all([local, remote]).catch(e => console.error("Error negotiating answer: ", e));
    } else {
      //console.log('other event');
      //console.log(ev);
    }
  });
}


export function sendControlMessage(ctx, channel, msg) {
  let obj = {
    "message": msg,
    "timestamp": new Date(),
    "from": ctx.user_id
  }
  if (channel.readyState == 'open') {
    console.log('sending: ');
    console.log(obj);
    channel.send(JSON.stringify(obj));
  } else {
    console.log('error');
    console.log(channel.readyState);
  }
}

// creates a new unreliable channel
function newDataChannel ( id ) {
  const channel = janusconn.createDataChannel(id , DATACHAN_CONF );
  return channel
}

function showStatus (msg) {
  console.log(msg);
}

async function attachPublisher(ctx) {
  console.info("Attaching publisher for session: ", ctx.session);
 
  //console.log('room: ', ctx.roomId, 'ctx: ', ctx);
  janusconn = new RTCPeerConnection(PEER_CONNECTION_CONFIG);
  var handle = new Minijanus.JanusPluginHandle(ctx.session);
  associate(janusconn, handle, "attach publisher");
  const friends = document.getElementById("friends")
 
  // Handle all of the join and leave events.
  handle.on("event", ev => {
    var data = ev.plugindata.data;
  
    if (data.event == "join" && data.room_id == ctx.roomId) {
      //console.log('join event: ', data)
      addUser(ctx, data.user_id);
    } else if (data.event == "leave" && data.room_id == ctx.roomId) {
      removeUser(ctx, data.user_id);
    } else if (data.event == "data") {
      //console.log(data);
    } else if (!data.room_id == ctx.roomId) {
      throw "data.room_id != ctx.roomId";
    } else if (data.response) {
      //console.log('response event: ', data);
      if (data.response.users) {
        //userlist for room, check if it is for room we think we are in:
        //console.log('userlist: ', data.response.users, ctx.roomId);
        if( data.response.users[ctx.roomId] ) {
          console.log('correct room, now checking if users match');
            
            //var occupants = reply.plugindata.data.response.users[ctx.roomId] || [];
            // here is where all users are created when you initially join the room
            //await Promise.all(occupants.map(userId => addUser(ctx, userId)));
            data.response.users[ctx.roomId].forEach(function ( user ) {
              //console.log(user);
              addUser(ctx, user);
            });

        } else { // wrong room id
    /* 
          while (friends.firstChild) {
            // TODO: call a cleanup function on each friend
            console.log('removing all friends')
            friends.removeChild(friends.lastChild);
          }
*/
        } // wrong room id
      }
    } else {

      if (ev.jsep && ev.jsep.type == "offer") {
        console.log('jsep offer, handled in other place');
      } else {

        if (ev.jsep) {
          console.log('jsep event, but not offer', ev);
        } else {

          console.log('unhandled event: ', ev);
        }
      }
      
      // Some events get handled in the associate eventhandler
  }     //throw "unhandled event";
    
  });

  await handle.attach("janus.plugin.sfu")
  showStatus(`Connecting WebRTC...`);
 
  // this is the channel we gonna publish video on
  ctx.controlChannel = newDataChannel("hushpipe_controlchannel");
 
  // this is the channel we gonna publish video on
  ctx.videoChannel = newDataChannel("video_high_" + ctx.user_id);

  const myface = document.getElementById('myface');
    //const audiosend_el = document.getElementById('audiosender');

  //audio normal
  const audioChannel = newDataChannel("audio_" + ctx.user_id);
  const audiosend_el = myface.appendChild(document.createElement('fieldset'));
  audiopipe.create_sender(audiosend_el, audioChannel, ctx.encryptor);

  // audio wasm opus
  const opusChannel = newDataChannel("opus_" + ctx.user_id);
  const opussend_el = myface.appendChild(document.createElement('fieldset'));
  opuspipe.create_sender(opussend_el, opusChannel, ctx.encryptor);

 //chat
  const chatChannel = newDataChannel("chat");
  const chat_el = myface.appendChild(document.createElement('fieldset'));
  chat.create_duplex(chat_el, chatChannel, ctx.encryptor, ctx.decryptor);



  await waitForEvent("webrtcup", handle);

  showStatus(`Joining room ${ctx.roomId}...`);

  //console.log("user: ", ctx.user_id, "room: ", ctx.roomId);

  // join the room ourselves
    const msg ={
      kind: "join",
      room_id: ctx.roomId,
      user_id: ctx.user_id,
      subscribe: { notifications: true, data: true }
    }
    //console.log(msg);
    const reply = await handle.sendMessage(msg);

  return  { handle, janusconn};
}

// creating all the channels for friend
function attachSubscriber(ctx, otherId) {
  console.info("Attaching subscriber to " + otherId + " for session: ", ctx.session);
  var conn = new RTCPeerConnection(PEER_CONNECTION_CONFIG);
  var handle = new Minijanus.JanusPluginHandle(ctx.session);
  addExisting(conn, handle, "attach subscriber: " + otherId);

  // video
  const chan_video_high = newDataChannel("video_high_" + otherId);
  const userEl = getUserEl(otherId);
  const videofeed = hush_new_feed(userEl, "video_high");
  let curryplayvideo = (videofeed) => (evt) => hush_play_datachannel(evt, videofeed);
  chan_video_high.addEventListener("message", curryplayvideo(videofeed));

  //audio
  const chan_audio = newDataChannel("audio_" + otherId);

  // new_pipe creates a div with id "audio" under the user div
  const audiofeed = hush_new_pipe(userEl, "audio"); 
  audiopipe.create_receiver(audiofeed, chan_audio, ctx.decryptor);

  
  return handle.attach("janus.plugin.sfu")
    .then(_ => handle.sendMessage({ kind: "join", room_id: ctx.roomId, user_id: ctx.user_id, subscribe: { media: otherId }}))
    .then(_ => waitForEvent("webrtcup", handle))
    .then(_ => { return { handle: handle, conn: conn }; });
}


