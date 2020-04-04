'use strict';
import * as audiopipe from "./pipe_mod.js";
//import { create_sender } from "./pipe_mod.js";

import { hush_new_feed, hush_play_datachannel } from "./hushpipe.js";

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
function isError(signal) {
  var isPluginError =
      signal.plugindata &&
      signal.plugindata.data &&
      signal.plugindata.data.success === false;
  return isPluginError || Minijanus.JanusSession.prototype.isError(signal);
}

// deal with messages from janus
function receiveMsg(session,ev) {
  session.receive(JSON.parse(ev.data))
}

// connect to janus (the SFU server)
export function janus_connect(ctx, server) {
//  console.log("1 ctx in janus_connect: ", ctx);

  var ws = new WebSocket(server, "janus-protocol");
  var session = ctx.session = new Minijanus.JanusSession(ws.send.bind(ws), { verbose: true });
  session.isError = isError;
  ws.addEventListener("message", ev => receiveMsg(session,ev));

  ws.addEventListener("open", (socket) => {

    ctx.session.create()
    .then( function pub (something) {
        console.log("ctx in janus_connect: ", ctx);
        attachPublisher(ctx);
    }).then(x => { ctx.publisher = x; }, err => console.error("Error attaching publisher: ", err));
  });
}

// create a DOM element for a user in the room, all state of that user is stored here
export function getUserEl(userId) {
  const elid = "hushpipe_user_" + userId;
  const users = document.getElementById('friends');
  console.log(users);
  if (document.getElementById(elid)) {
    // user is already known
    return document.getElementById(elid);
  } else {  // user not seen before
    const user = document.createElement('div');
    user.janus_user_id = userId;
    user.setAttribute('id', elid);
    user.setAttribute('class', 'friend_div');
    users.appendChild(user);
    let title = document.createElement('h3');
    title.textContent = userId;
    user.appendChild(title);
    return user;
  }

}


function addUser(ctx, userId) {
  //console.log("ctx in addUser: ", ctx);

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
 
  console.log('room: ', ctx.roomId, 'ctx: ', ctx);
  janusconn = new RTCPeerConnection(PEER_CONNECTION_CONFIG);
  var handle = new Minijanus.JanusPluginHandle(ctx.session);
  associate(janusconn, handle, "attach publisher");
  
  // Handle all of the join and leave events.
  handle.on("event", ev => {
    var data = ev.plugindata.data;
    if (data.event == "join" && data.room_id == ctx.roomId) {
      console.log('join event: ', data)
      addUser(ctx, data.user_id);
    } else if (data.event == "leave" && data.room_id == ctx.roomId) {
      removeUser(ctx, data.user_id);
    } else if (data.event == "data") {
      console.log(data);
    } else if (!data.room_id == ctx.roomId) {
      throw "data.room_id != ctx.roomId";
    } else if (data.response) {
      console.log('response event: ', data);
    } else {
      console.log('unhandled event: ', ev);
      // Some events get handled in the associate eventhandler
      //throw "unhandled event";
    }
  });

  await handle.attach("janus.plugin.sfu")
  showStatus(`Connecting WebRTC...`);
 
  // this is the channel we gonna publish video on
  ctx.controlChannel = newDataChannel("hushpipe_controlchannel");
 
  // this is the channel we gonna publish video on
  ctx.videoChannel = newDataChannel("video_high_" + ctx.user_id);

  await waitForEvent("webrtcup", handle);
  showStatus(`Joining room ${ctx.roomId}...`);

  console.log("user: ", ctx.user_id, "room: ", ctx.roomId);
 
  //try {
    const msg ={
      kind: "join",
      room_id: ctx.roomId,
      user_id: ctx.user_id,
      subscribe: { notifications: true, data: true }
    }
    console.log(msg);
    const reply = await handle.sendMessage(msg);
  // } catch(err) {
  //  console.log("err in reply: ", err); 
  //}


  showStatus(`Subscribing to others in room ${ctx.roomId}`);
  var occupants = reply.plugindata.data.response.users[ctx.roomId] || [];
  // here is where all users are created when you initially join the room
  await Promise.all(occupants.map(userId => addUser(ctx, userId)));

  // returns handle + rtcpeerconn + videoChannel to send on
  return  { handle, janusconn};
}

function attachSubscriber(ctx, otherId) {
  console.info("Attaching subscriber to " + otherId + " for session: ", ctx.session);
  var conn = new RTCPeerConnection(PEER_CONNECTION_CONFIG);
  var handle = new Minijanus.JanusPluginHandle(ctx.session);
  addExisting(conn, handle, "attach subscriber: " + otherId);

  // this is 1 of the channels to receive video on 
  const chan_video_high = newDataChannel("video_high_" + otherId);
  const userEl = getUserEl(otherId);
//  userEl.chan_video_high = highVideoChannel;
  const feed = hush_new_feed(userEl, "video_high");

  let curryplayvideo = (feed) => (evt) => hush_play_datachannel(evt, feed);

  chan_video_high.addEventListener("message", curryplayvideo(feed));
//  chan_video_high.addEventListener("message", hush_play_video,feed);


  
  return handle.attach("janus.plugin.sfu")
    .then(_ => handle.sendMessage({ kind: "join", room_id: ctx.roomId, user_id: ctx.user_id, subscribe: { media: otherId }}))
    .then(_ => waitForEvent("webrtcup", handle))
    .then(_ => { return { handle: handle, conn: conn }; });
}


