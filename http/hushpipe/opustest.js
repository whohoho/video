/*
if(typeof require != "undefined" && typeof libopus == "undefined"){
  LIBOPUS_WASM_URL = "opus/libopus.wasm";
  libopus = require("opus/libopus.wasm.js");
}
*/
/*
 * const gainParam = whiteNoiseNode.parameters.get('customGain')
gainParam.setValueAtTime(0, audioContext.currentTime)
gainParam.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.5)
*/
/*
 *   WebAssembly.instantiateStreaming(fetch('opus/libopus.wasm'), importObject)
    .then(obj => {
      // Call an exported function:
      obj.instance.exports.exported_func();

      // or access the buffer contents of an exported memory:
      var i32 = new Uint32Array(obj.instance.exports.memory.buffer);

      // or access the elements of an exported table:
      var table = obj.instance.exports.table;
      console.log(table.get(0)());
    })

*/

async function init () {

  const actx = new AudioContext();
  const ctx = {};
  ctx.actx = actx;
  await actx.audioWorklet.addModule('opus-encoder.js');


  navigator.webkitGetUserMedia({audio: true}, success, err);

  function success( stream ) {
    var instream = actx.createMediaStreamSource(stream);

  const encoderNode = new AudioWorkletNode(actx, 'opus-encoder');

  encoderNode.onmessage = function (msg) {
    console.log('encoded msg: ', msg); 
  };

  encoderNode.connect(actx.destination);

    instream.connect(encoderNode)

    //src.connect(ctx.destination);
  }

  function err( e ) {
    console.log(e);
  }

/*
  // success callback when requesting audio input stream
  function gotStream(stream) {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      var audioContext = new AudioContext();

      // Create an AudioNode from the stream.
      var mediaStreamSource = audioContext.createMediaStreamSource( stream );
      ctx.source = mediaStreamSource

      // Connect it to the destination to hear yourself (or any other node for processing!)
      //mediaStreamSource.connect( audioContext.destination );
  }

  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
  navigator.getUserMedia( {audio:true}, gotStream );
*/
}

window.addEventListener("onload", init());
