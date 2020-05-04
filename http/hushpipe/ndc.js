/* FIXME: build janus.es.js with:
 *  git clone git://github.com/meetecho/janus-gateway.git
 * ./autogen.sh
 * ./configure --enable-javascript-es-module=yes
 * make
 * cat /npm/bundles/janus.es.js
 */
import * as utils from "./utils.js";

import { Janus } from './janus.js'
//import * as Janus from './janus.es.js'

import { hush_add_user, hush_remove_user, hush_new_pipe, hush_get_user_elem } from "./hushpipe.js";
import { DATACHAN_CONF, PEER_CONNECTION_CONFIG  } from "./settings.js";

import "./bundle.js";

  console.log(Janus);

export function janus_init(ctx) {
  var elem = document.getElementById('hushpipe_controls');
  console.log('elem', elem);
  var serverselect = document.getElementById('hush_serverselect');
  var server = serverselect.value;

  var statusel = utils.statusel(elem, 'serverconnection', 'connecting');

   const s = document.getElementById("myface");
   const f = document.getElementById("friends");


  serverselect.addEventListener('change', (event) => {
  //  if (document.server_changed != true) {
      console.log('server changed');
      ctx.ws.close();
      ctx.ws = null;
      document.server_changed = true;
     // ctx.session.destroy();
   // }
    janus_connect(ctx);
  });
  
  janus_connect(ctx);
}

async function get_websocket() {
  var serverselect = document.getElementById('hush_serverselect');
  var server = serverselect.value;
  if (!document.ctx.ws) {
    console.log('creating new websocket');
    utils.statusel(null, 'serverconnection', 'connecting_websocket');

    document.ctx.ws = new WebSocket(server, "janus-protocol");
    document.ctx.ws.addEventListener("message", ev => receive_from_janus(JSON.parse(ev.data)));
    await utils.sleep(1);
    
    while (true){
      //console.log(document.ctx.ws);
      if (document.ctx.ws.readyState == 1) {
        console.log("got a websocket", document.ctx.ws); 
        utils.statusel(null, 'serverconnection', 'connected_websocket');

//        document.ctx.ws.send('test');
        return document.ctx.ws;
      }
      if (document.ctx.ws.readyState == 3)
      {
        utils.statusel(null, 'serverconnection', 'closed_websocket');
        console.log('failure, FIXME, reconnect or something ', document.ctx.ws);
        return;
      }
    await utils.sleep(100); 
    };
  }
return document.ctx.ws;
};

function send_to_janus(msg) {
   // this == ctx
   //console.log('sending to janus: ',msg);
  //FIXME: fall back to http when no websocket or something
   //var ws = get_websocket();
   document.ctx.ws.send(msg)
}

function receive_from_janus(evt) {
   //console.log('got from janus: ', evt);
   document.ctx.janus_session.receive(evt)


}

async function evt_icecandidate(evt, sfuh) {
  //console.log('icecandidate: ', evt);
  sfuh.sendTrickle(evt.candidate || null).catch(e => console.error("Error trickling ICE: ", e));
}
async function evt_negotiationneeded(evt, sfuh) {
  var rtcpc = evt.target;
  var offer = await rtcpc.createOffer();
  //console.log('offer: ', offer);
  var local = await rtcpc.setLocalDescription(offer);
  //console.log('neg needed, evt,  local: ', evt, await local);

  var remote = await sfuh.sendJsep(offer);
  await rtcpc.setRemoteDescription(remote.jsep);

}


function control_plugin_evt(evt, handle) {
    var data = evt.plugindata.data;
//    console.log('plugin evt: ', evt, handle, data.room_id, handle.room_id); 
    if (data.event == "join" && data.room_id == handle.room_id) {
    
      hush_add_user(document.ctx, data.user_id);

    } else if (data.event == "leave" && data.room_id == handle.room_id) {
   
      hush_remove_user(document.ctx, data.user_id);

    } else if (data.event == "data") {
      console.log(data);
    }

};

async function sfu_handle(ctx, name) { 

  var d = {}

  d.room_id = ctx.room_id + '_' +name;
  d.handle = await new Minijanus.JanusPluginHandle(ctx.janus_session);
  await d.handle.attach("janus.plugin.sfu")
  d.handle.on('event', function (evt) { control_plugin_evt(evt, d); } );
  d.pc = new RTCPeerConnection(PEER_CONNECTION_CONFIG);
  await d.pc.addEventListener("icecandidate", function (evt) { evt_icecandidate(evt, d.handle); });
  await d.pc.addEventListener("negotiationneeded", function (evt) { evt_negotiationneeded(evt, d.handle); });

  const reply = await d.handle.sendMessage({
    kind: "join",
    room_id: d.room_id,
    user_id: ctx.user_id,
    subscribe: { notifications: true, data: true }
  });

  var occupants = reply.plugindata.data.response.users[d.room_id] || [];
  console.log('occupants:  ',d, occupants);

  return d;
}




export async function janus_connect(ctx) {


  var ws = await get_websocket(ctx);

  ctx.janus_session = await new Minijanus.JanusSession(send_to_janus.bind(ctx), { verbose: true });

  await ctx.janus_session.create();

  ctx.sfu_control = await sfu_handle(ctx, 'sfu');

  ctx.sfu2 = await sfu_handle(ctx, 'sfu2');


  var testCh = await ctx.sfu_control.pc.createDataChannel("unreliable", { ordered: false, maxRetransmits: 0 });
  var testCh2 = await ctx.sfu2.pc.createDataChannel("unreliable", { ordered: false, maxRetransmits: 0 });


//  ctx.controlhandle = new Minijanus.JanusPluginHandle(ctx.session);
  //associate(janusconn, handle, "attach publisher");
 

  if (ctx.session) {
    console.log('existing session');
    //ctx.session.destroy();
    //ctx.session = null;
    //utils.sleep(1000);
  }
/*
  ctx.session = new Janus(
        {
                server: server,
                success: async function() {
                  console.log('janus connection successfull', ctx.session);
                  utils.statusel(null, 'serverconnection', 'connected');
                  //document.server_changed = false;
                   
                },
                error: async function(e) {
                  console.log('janus connection fail, retrying in 2 seconds: ', e);
                  utils.statusel(null, 'serverconnection', 'failed');
                  await utils.sleep(2000); 
                  utils.statusel(null, 'serverconnection', 'failed_retrying');
                  janus_connect(ctx);

                },
                destroyed: function() {
                    console.log('janus connection destroyed: ');
                    utils.statusel(null, 'serverconnection', 'destroyed');
                    //document.server_changed = false;
                    //janus_connect(ctx);


                }
        });
*/
 }



