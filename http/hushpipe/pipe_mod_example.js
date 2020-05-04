'use strict';
import { 
  destroy_sender, 
  destroy_receiver, 
  cleanup, 
  DATACHAN_CONF,
  common_create_sender,
  common_create_receiver,
//  DEFAULTS,
} from "./pipe-common.js";

import * as pc from "./pipe-common.js";
import { capture_works, play_datachannel } from './vp.js';
import * as utils from "./utils.js";
export const DEFAULTS = pc.DEFAULTS;
export const NAME = 'audio';



// create a sender
// status_el , DOM element it can use to keep its status, display controls / status to user
// encryptor, curried function it can use to encrypt
export async function create_sender(status_el, channel_name, peerconn , encryptor) {

  const channel = peerconn.createDataChannel(channel_name, DATACHAN_CONF );

  const t = {
    c: DEFAULTS,
    NAME: NAME,
    log: console.log,
    elem: status_el,
    encryptor: encryptor,
    channel: channel, 
    channel_name: channel_name,
    peerconn: peerconn,
  };
  console.log('t', t); 

  common_create_sender(t);

  utils.formel('range', t.elem, NAME + '_sender_volume', function () { return; } );
  

  var s = await utils.start_stream();
  console.log('stream: ', s, t);
  capture_works(s, t);  
}

function mute_sender(t) {

  return;
}


// create a receiver 
// status_el , DOM element it can use to keep its status, display controls / status to user
// decryptor, curried function it can use to encrypt
export function create_receiver(pipe_el, channel_name, peerconn ,decryptor) {
 
  const channel = peerconn.createDataChannel(channel_name, DATACHAN_CONF );
  
  const t = {
    c: DEFAULTS,
    NAME: NAME,  
    log: console.log,
    elem: pipe_el,
    decryptor: decryptor,
    channel: channel, 
    channel_name: channel_name,
    peerconn: peerconn,
  };

  common_create_receiver(t);

  utils.formel('range', t.elem, NAME + '_receiver_volume', function () {
  return; 
  });

 
  }



