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
export const NAME = 'chat';

async function send (t, packetv, seq, packet) {
  //console.log(packetv, seq);
  
  //console.log('encr: ', t.encryptor); 
    try {
      var ciphertext = await encrypt(document.hush_key, packetv, seq);
    } catch (e) {
      console.log('encryption failed', e);
    }
      try {
       /* 
        debug('chan in please_encrypt: \n chan: ', t.channel, 
              '\ncrypter: ', t.encryptor, 
              '\ncyphertext: ', ciphertext, 
              '\ndata: ', blob_event.data);
              */
        switch(t.channel.readyState) {
            case "connecting":
              break;
            case "open":
              //console.log('.');
              t.channel.send(ciphertext);
              break;
            case "closing":
              console.log("Attempted to send message while closing: " , blob_event);
              break;
            case "closed":
              console.log("Error! Attempt to send while connection closed.", blob_event);
              blob_event.srcElement.stop();
              break; 
        }

      } catch (err) { warn('send failed: ', err) }


  //console.log('ct', ciphertext);
  
  try {
  var plaintest = await t.decryptor(ciphertext); 
  } catch (e) {
    console.log('decryption failed', e);
  }
  //console.log('pt', plaintest);
  
  t.wasm._free(packet);
  
}




