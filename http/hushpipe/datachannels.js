'use strict';
import * as utils from "./utils.js";

//  import * as audiopipe from "./pipe_mod.js";
//import * as opuspipe from "./opuspipe.js";
//import * as chat from "./chat.js";


//import { create_sender } from "./pipe_mod.js";

import { hush_new_pipe, hush_get_user_elem } from "./hushpipe.js";
import { DATACHAN_CONF, PEER_CONNECTION_CONFIG  } from "./settings.js";


//FIXME
var janusconn;
var messages = [];


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

export function janus_init(ctx) {
  janus_connect(ctx);

}

// connect to janus (the SFU server)
export function janus_connect(ctx) {
//  console.log("1 ctx in janus_connect: ", ctx);

  var serverselect = document.getElementById('hush_serverselect');
  var server = serverselect.value;

  var ws = new WebSocket(server, "janus-protocol");
  console.log('ws: ', ws, ws.send, ws.send.bind);
  var session = ctx.session = new Minijanus.JanusSession(ws.send.bind(ws), { verbose: true });



  serverselect.addEventListener('change', (event) => {
    console.log('server changed');
    session.dispose();
    janus_connect(ctx);
  });

  // FIXME, what does this do?? // session.isError = isError;
  //

  // deal with websocket messages from janus
  function receiveMsg(session,ev) {
    session.receive(JSON.parse(ev.data))
  }
  ws.addEventListener("message", ev => receiveMsg(session,ev));

  ws.addEventListener("close", (socket) => {
    console.log('ws closed');
    session.destroy();
   const s = document.getElementById("myface");
    while (s.firstChild) {
      s.removeChild(s.lastChild);
    }
    const f = document.getElementById("friends");
    while (f.firstChild) {
      f.removeChild(s.lastChild);
    }


  });

  ws.addEventListener("open", (socket) => {

    ctx.session.create()
    .then( function pub (something) {
        //console.log("ctx in janus_connect: ", ctx);
        attachPublisher(ctx);
    }).then(x => { ctx.publisher = x; }, err => console.error("Error attaching publisher: ", err));
  });
}


async function addUser(ctx, userId) {
  hush_add_user(ctx, userId);
  return await attachSubscriber(ctx, userId)
    .then(x =>   { ctx.subscribers[userId] = x; }, err => console.error("Error attaching subscriber: ", err));
}

function removeUser(ctx, userId) {
  hush_remove_user(ctx, userId);
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
    //console.info("Sending new offer for handle: ", handle, debugmsg);
    var offer = conn.createOffer();
    var local = offer.then(o => conn.setLocalDescription(o));
    var remote = offer.then(j => handle.sendJsep(j)).then(r => conn.setRemoteDescription(r.jsep));
    Promise.all([local, remote]).catch(e => console.error("Error negotiating offer: ", e));
  });
  handle.on("event", ev => {
    if (ev.jsep && ev.jsep.type == "offer") {
      console.info("Accepting new offer for handle: ", handle, debugmsg, ev);
      var answer = conn.setRemoteDescription(ev.jsep).then(_ => conn.createAnswer());
      var local = answer.then(a => conn.setLocalDescription(a));
      var remote = answer.then(j => handle.sendJsep(j));
      Promise.all([local, remote]).catch(e => console.error("Error negotiating answer: ", e));
    } else if (ev.jsep && ev.jsep.type == "answer") {
      //console.log('associate: jsep answer', ev);
      // FIXME!! figure out how this whole jsep stuff actually works
      //console.info("associate:  answer for handle: ", handle, debugmsg, ev);
      //conn.setRemoteDescription(ev.jsep)
      //var local = answer.then(a => conn.setLocalDescription(a));
      //var remote = answer.then(j => handle.sendJsep(j));
      //Promise.all([local, remote]).catch(e => console.error("Error negotiating answer: ", e));

    } else {
        //console.log('associate: unknown', ev);

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
  handle.on("event", async ev => {
    var data = ev.plugindata.data;
  
    if (data.event == "join" && data.room_id == ctx.roomId) {
      //console.log('join event: ', data)
      await addUser(ctx, data.user_id);
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
            data.response.users[ctx.roomId].forEach(async function ( user ) {
              //console.log(user);
              await addUser(ctx, user);
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

        if (ev.jsep && ev.jsep.type == "answer") {
          //console.log('jsep answer', ev);
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
  //ctx.videoChannel = newDataChannel("video_high_" + ctx.user_id);

  const myface = document.getElementById('myface');
  let audiopipe = await import('./pipe_mod.js');
  const audiosend_el = myface.appendChild(document.createElement('fieldset'));
  let apt = audiopipe.create_sender(audiosend_el, "audio_" + ctx.user_id, janusconn, ctx.encryptor, ctx.decryptor);

  /*
  // audio wasm opus
  const opusChannel = newDataChannel("opus_" + ctx.user_id);
  const opussend_el = myface.appendChild(document.createElement('fieldset'));
  opuspipe.create_sender(opussend_el, opusChannel, ctx.encryptor);

 //chat
  const chatChannel = newDataChannel("chat");
  const chat_el = myface.appendChild(document.createElement('fieldset'));
  chat.create_duplex(chat_el, chatChannel, ctx.encryptor, ctx.decryptor);
*/


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
async function attachSubscriber(ctx, otherId) {
  console.info("Attaching subscriber to " + otherId + " for session: ", ctx.session);
  var conn = new RTCPeerConnection(PEER_CONNECTION_CONFIG);
  var handle = new Minijanus.JanusPluginHandle(ctx.session);
  addExisting(conn, handle, "attach subscriber: " + otherId);

  const userEl = hush_get_user_elem(otherId);
  // video
  /* TEMP
  const chan_video_high = newDataChannel("video_high_" + otherId);
  const videofeed = hush_new_feed(userEl, "video_high");
  let curryplayvideo = (videofeed) => (evt) => hush_play_datachannel(evt, videofeed);
  chan_video_high.addEventListener("message", curryplayvideo(videofeed));
  let cstats = document.createElement('pre');
  var br = document.createTextNode(" stats here\n");
  cstats.appendChild(br);
  userEl.appendChild(cstats);
  window.setInterval(function () { utils.rendercstats(cstats, chan_video_high); }, 2000);

  */

  //audio
  //const chan_audio = newDataChannel("audio_" + otherId);

  // new_pipe creates a div with id "audio" under the user div
  const audiofeed = hush_new_pipe(userEl, "audio"); 
  let audiopipe = await import('./pipe_mod.js');
  audiopipe.create_receiver(audiofeed, "audio_" + otherId, janusconn, ctx.decryptor);
 
  
  return handle.attach("janus.plugin.sfu")
    .then(_ => handle.sendMessage({ kind: "join", room_id: ctx.roomId, user_id: ctx.user_id, subscribe: { notifications: true, data: true, media: otherId }}))
    .then(_ => waitForEvent("webrtcup", handle))
    .then(_ => { return { handle: handle, conn: conn }; });
    
}


