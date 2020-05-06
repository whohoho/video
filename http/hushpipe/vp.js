import * as utils from "./utils.js";



export async function capture_works(s, t){
      if (t.rec_handle) {
        console.log('already got a recorder, recreating it');
        t.rec_handle.stop();
        t.rec_handle = undefined;
      };
      var rec_handle = new MediaRecorder(s);
      t.rec_handle = rec_handle;
      t.rec_handle.ondataavailable = function (data) { 
//        console.log('audiorecord callback ', data);
        utils.please_encrypt(data, t); 
      }
      t.rec_handle.start(t.c.REC_MS);
  }

// takes datachannel event + feed element (div with 1 video inside)
export async function play_datachannel(evt, t) {
//	 console.log("new audio buffer: ", evt, t);

   var uint8View = new Uint8Array(evt.data);
   play(uint8View, t)
}

// takes encrypted uint8array + feed element (div with 1 video inside)
export async function play(ciphertext, t) {
  // console.log('encryptee: ', ciphertext, 'on feed: ' , t.pipe_el); 
  // let v = t.pipe_el.getElementsByTagName(TYPE)[0];
  //console.log('audio state: ', t.pipe_el.parentElement.id , v.currentTime, v.buffered, v.currentSrc, v.duration, v.ended, v.error, v.networkState);

    try {
   var plain = await t.decryptor(ciphertext);
    } catch (err) {

      console.log('decryption failed (hush_play): ', err, ciphertext, t.elem);
      return;
    }
    if (t.buffer) {
      if (t.buffer.updating || t.queue.length > 0) {
        t.queue.push(plain);
      } else {
        t.buffer.appendBuffer(plain);
      }
    }
}


