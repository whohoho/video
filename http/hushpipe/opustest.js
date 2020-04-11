// https://www.darkcoding.net/software/reading-mediarecorders-webm-opus-output/
// https://github.com/GoogleChromeLabs/web-audio-samples/blob/master/audio-worklet/design-pattern/wasm/wasm-worklet-processor.js
async function init () {

  const actx = new AudioContext();
  await actx.audioWorklet.addModule('opus-encoder.js');

  const ctx = {};
  ctx.actx = actx;
  navigator.webkitGetUserMedia({audio: true}, success, err);

  function success( stream ) {
    var instream = actx.createMediaStreamSource(stream);

    const procopt = {
      wasm: null,
    };

    const options = {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: 1,
      processorOptions: procopt,
    };

    const encoderNode = new AudioWorkletNode(actx, 'opus-encoder');

    encoderNode.onmessage = function (msg) {
      console.log('encoded msg: ', msg); 
    };

    encoderNode.connect(actx.destination);

    instream.connect(encoderNode);

  } // usermedia success
  
  function err( e ) {
    console.log(e);
  };
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
} // init
console.log('hello');
window.addEventListener("onload", init());
