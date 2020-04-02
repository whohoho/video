const params = new URLSearchParams(location.search.slice(1));

//var conn;

var USER_ID = new String(Math.floor(Math.random() * (1000000001)));
//var USER_ID = "23";



const roomId = params.get("room") != null ? params.get("room") : "42";

const DATACHAN_CONF = {
  ordered: false, 
  maxRetransmits: 0,
//  maxPacketLifeTime: null,
  protocol: "",
//  negotiated: false,

};

const PEER_CONNECTION_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478?transport=udp" }
  ]
};

// global helper for interactive use
var c = {
  session: null,
  publisher: null,
  subscribers: {}
};

const status = document.getElementById("status");
function showStatus(message) {
  status.textContent = message;
}

function isError(signal) {
  var isPluginError =
      signal.plugindata &&
      signal.plugindata.data &&
      signal.plugindata.data.success === false;
  return isPluginError || Minijanus.JanusSession.prototype.isError(signal);
}

function receiveMsg(session,ev) {
  session.receive(JSON.parse(ev.data))
  //console.log(ev.data);
}

function connect(server) {
  document.getElementById("janusServer").value = server;
  showStatus(`Connecting to ${server}...`);
  var ws = new WebSocket(server, "janus-protocol");
  var session = c.session = new Minijanus.JanusSession(ws.send.bind(ws), { verbose: true });
  session.isError = isError;
  ws.addEventListener("message", ev => receiveMsg(session,ev));
  ws.addEventListener("open", _ => {
    session.create()
      .then(_ => attachPublisher(session))
      .then(x => { c.publisher = x; }, err => console.error("Error attaching publisher: ", err));
  });
}
function addUser(session, userId) {
  console.info("Adding user " + userId + ".");
  return attachSubscriber(session, userId)
    .then(x => { c.subscribers[userId] = x; }, err => console.error("Error attaching subscriber: ", err));
}

function removeUser(session, userId) {
  console.info("Removing user " + userId + ".");
  document.querySelectorAll('.media-' + userId).forEach(el => el.remove());
  var subscriber = c.subscribers[userId];
  if (subscriber != null) {
    subscriber.handle.detach();
    subscriber.conn.close();
    delete c.subscribers[userId];
  }
}

let messages = [];

const messageCount = document.getElementById("messageCount");
function updateMessageCount() {
  messageCount.textContent = messages.length;
}

let firstMessageTime;

function storeMessage(data, reliable) {
  if (!firstMessageTime) {
    firstMessageTime = performance.now();
  }
  messages.push({
    time: performance.now() - firstMessageTime,
    reliable,
//    message: JSON.parse(data)
    message: data,
  });
  updateMessageCount();
}

function storeReliableMessage(ev) {
  storeMessage(ev.data, true);
}

function storeUnreliableMessage(ev) {
  storeMessage(ev.data, false);
}

function storeVideoMessage(ev, from) {
  storeMessage(ev.data, false);
  console.log('videomessage from: ' + from )
  console.log(ev.data);
}


document.getElementById("saveButton").addEventListener("click", function saveToMessagesFile() {
  const file = new File([JSON.stringify(messages)], "messages.json", {type: "text/json"});
  saveAs(file);
});

document.getElementById("clearButton").addEventListener("click", function clearMessages() {
  messages = [];
  updateMessageCount();
});

function waitForEvent(name, handle) {
  return new Promise(resolve => handle.on(name, resolve));
}

function addExisting(conn, handle, debugmsg) {
 // handle is plugin handle, conn is peerconnection 
conn.createOffer(
    {
      media: { addData: true },
        success: function(jsep) {
            Janus.debug(jsep);
            //echotest.send({message: {audio: true, video: true}, "jsep": jsep});
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

function sendData(channel, msg) {
  let obj = {
    "message": msg,
    "timestamp": new Date(),
    "from": USER_ID
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

function newDataChannel ( id ) {
  const channel = janusconn.createDataChannel(id , DATACHAN_CONF );
  channel.addEventListener("message", storeUnreliableMessage);
 // videoChannel.addEventListener("message", storeUnreliableMessage);
  channel.addEventListener("onopen", sendData(channel, "chan is now open" + id));
  setInterval(sendData, 1000, channel, "every second a messae on " + id);
  return channel
}

async function attachPublisher(session) {
  console.info("Attaching publisher for session: ", session);
 // don't need a new one
  janusconn = new RTCPeerConnection(PEER_CONNECTION_CONFIG);
  var handle = new Minijanus.JanusPluginHandle(session);
  associate(janusconn, handle, "attach publisher");
  
  // Handle all of the join and leave events.
  handle.on("event", ev => {
    var data = ev.plugindata.data;
    if (data.event == "join" && data.room_id == roomId) {
      this.addUser(session, data.user_id);
    } else if (data.event == "leave" && data.room_id == roomId) {
      this.removeUser(session, data.user_id);
    } else if (data.event == "data") {
      console.log(data);
    }
  });

  await handle.attach("janus.plugin.sfu")
  showStatus(`Connecting WebRTC...`);
  
  // this is the channel we gonna publish video on
  const videoChannel = newDataChannel("video");
/*
  const videoChannel = janusconn.createDataChannel("video" + USER_ID , DATACHAN_CONF );
  videoChannel.addEventListener("message", storeUnreliableMessage);
 // videoChannel.addEventListener("message", storeUnreliableMessage);
  videoChannel.addEventListener("onopen", sendData(videoChannel, "chan is now open"));
  setInterval(sendData, 1000, videoChannel, "every second a messae");
*/
  await waitForEvent("webrtcup", handle);
  showStatus(`Joining room ${roomId}...`);
  const reply = await handle.sendMessage({
    kind: "join",
    room_id: roomId,
    user_id: USER_ID,
    subscribe: { notifications: true, data: true }
  });

  showStatus(`Subscribing to others in room ${roomId}`);
  var occupants = reply.plugindata.data.response.users[roomId] || [];
  await Promise.all(occupants.map(userId => addUser(session, userId)));

  // returns handle + rtcpeerconn
  return { handle, janusconn};
}

function attachSubscriber(session, otherId) {
  console.info("Attaching subscriber to " + otherId + " for session: ", session);
  var conn = new RTCPeerConnection(PEER_CONNECTION_CONFIG);
  var handle = new Minijanus.JanusPluginHandle(session);
  addExisting(conn, handle, "attach subscriber: " + otherId);
  const otherVideoChannel = newDataChannel("video" + otherId);


//  associate(conn, handle, "attach subscriber: " + otherId);
  //const vch = conn.createDataChannel("video" + otherId, DATACHAN_CONF) ;
  //vch.addEventListener("message", storeUnreliableMessage);
/*
  vch.addEventListener("onopen", sendData(vch, "chan is now open"));
  setInterval(sendData, 1000, vch, "every second a messae");

*/
    /*
  conn.addEventListener("track", ev => {
    console.info("Attaching " + ev.track.kind + " track from " + otherId + " for session: ", session);
    var mediaEl = document.createElement(ev.track.kind);
    mediaEl.className = 'media-' + otherId;
    mediaEl.controls = true;
    mediaEl.autoplay = true;
    mediaEl.srcObject = ev.streams[0];
    document.body.appendChild(mediaEl);
  });

    */
  return handle.attach("janus.plugin.sfu")
    .then(_ => handle.sendMessage({ kind: "join", room_id: roomId, user_id: USER_ID, subscribe: { media: otherId }}))
    .then(_ => waitForEvent("webrtcup", handle))
    .then(_ => { return { handle: handle, conn: conn }; });
}

connect(params.get("janus") || `ws://localhost:8188`);
