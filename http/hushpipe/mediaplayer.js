const mimetypes = [
'video/webm',
'video/webm;codecs=vp8',
'video/webm;codecs=vp9',
'video/webm;codecs=vp8.0',
'video/webm;codecs=vp9.0',
'video/webm;codecs=h264',
'video/webm;codecs=H264',
'video/webm;codecs=avc1',
'video/webm;codecs=vp8,opus',
'video/WEBM;codecs=VP8,OPUS',
'video/webm;codecs=vp9,opus',
'video/webm;codecs=vp8,vp9,opus',
'video/webm;codecs=h264,opus',
'video/webm;codecs=h264,vp9,opus',
'video/x-matroska;codecs=avc1',
'audio/webm',
'audio/webm;codecs=opus',
];


const TYPE = 'audio';

const CAPTURE_CONSTRAINTS = {audio: true};
//const MIMETYPE = 'audio/webm;codecs=opus';
const MIMETYPE = 'video/webm;codecs=vp8,vorbis'
const REC_MS = 10;
const RECOPT = { 
  audioBitsPerSecond :  64000,
  //videoBitsPerSecond : 2500000,
  //bitsPerSecond:       2628000,
  mimeType : MIMETYPE,
};

function mediaSource_sourceclose (e, mediaEl) {
  // mediasource died, create a new player -> mediasource -> sourcebuffer
  console.log('source closed', e);
}

function sourceBuffer_error (evt) { 
  console.log('sourceBuffer error: ', evt.target, evt);
  throw "sourcebuffer error";
}

function mediaSource_sourceopen (evt, mediaEl) {

  // check readystate
  if (!evt.target.readyState == 'open') {
    console.log(evt.target, evt.target.readyState);
    throw "we are in the sourceopen function, but readystate is not open";
  } 

  const buffer = evt.target.addSourceBuffer(MIMETYPE);
  
  buffer.mode = 'segments';

  //
  //  buffer.addEventListener('updatestart', function(evt) { console.log('updatestart: ' + evt.target); });
  //  buffer.addEventListener('update', function(evt) { console.log('update: ' + evt.target); });
  //  buffer.addEventListener('updateend', function(evt) { console.log('>>>updateend: ', evt.target.readyState, evt);  });
  //  buffer.addEventListener('abort', function(e) { console.log('abort: ', evt.target); });
  // 

  // curry the callback, so it know's sourcebuffer + mediaEl
  let sb_callback = (mediaEl) => (b) => (evt) => test_data_callback(evt, b, mediaEl);

  // for testing
  window.setInterval(sb_callback(mediaEl)(buffer),100);

  console.log('mediasource opened');

  // return a function, that can be used to put (decrypted) stuff in the decoder
  // sb_callback(uint8Array);
  return sb_callback;

} // mediaSource_sourceopen



// this should be called when there is a new mediaelement, or when the mediaelement has been reset with load()
function handleMediaEl_init(evt) {
  //    eventLog.textContent = eventLog.textContent + `${event.type}\n`;
  console.log('MediaEl_init: ', evt, evt.target);
  // check if mime is supported
  if (! 'MediaSource' in window && MediaSource.isTypeSupported(MIME)) {
    console.log('unsupported format', MIME);
    throw "format not supported";
  }

  let mediaSource = new MediaSource();
  mediaSource.addEventListener('sourceclose', function (evt) { 
    //FIXME: reset mediaEl.msrc ??
    mediaSource_sourceclose(evt, evt.target);
  });
  mediaSource.addEventListener('sourceopen',  function (soevt) { mediaSource_sourceopen(soevt, evt.target); });
  evt.target.msrc = mediaSource;
  console.log('evt.target.msrc',evt.target.msrc);

  evt.target.src = window.URL.createObjectURL(mediaSource);

}


function play_buffer_callback(evt, sourceBuffer, buf, mediaEl) {
  
   //   console.log('play buffer callback, evt',evt);
   //   console.log('play buffer callback, sb',sourceBuffer);
   //   console.log('play buffer callback, buf',buf);
   //   console.log('play buffer callback, mediaEl',mediaEl);
      
  if (!sourceBuffer) {
    throw 'nonexistant sourceBuffer in data_callback';
  }
  if (sourceBuffer.mode != 'segments')
    throw 'video is not segments WHAT\nx\nx\nx';
  if (sourceBuffer.error) // then we should wait
    throw 'video is ERRORed WHAT\ngx\nx\nx';
  if (sourceBuffer.updating){
    //
    // Technically speaking we should wait, instead we just drop frames
    //
    throw 'buf is updating, while we want to put something in it'
    sourceBuffer.addEventListener('updateend', function () {
      //try { video_element.buf.appendBuffer(plaintext);}catch(e){}
    }, { once: true, passive: true });
  } else { //not updating and no errors

    //console.log(sourceBuffer, evt);

    function doappend()
    {

      if (sourceBuffer) {
        //console.log('adding', mediaEl.msrc);
        sourceBuffer.appendBuffer(buf);
      } else {
        console.log('for some\n\nx\n\nx\n\n\nx fucking reason no buffer');
      }
    } // doappend

    if (mediaEl.updating) {
      mediaEl.msrc.addEventListener(
        'updateend',
        e => { doappend(); },
        {once:true,passive:true}
      );
    } else {
      doappend();
    }


  } // else
} //function



  // tests player with a file, normally would be the readfromdatachannel function
function test_data_callback(evt, sourceBuffer, mediaEl) {
    // FIXME, evt is null
    //  console.log('test_dat_callback', evt,sourceBuffer, mediaEl)

    var oReq = new XMLHttpRequest();
  oReq.open("GET", "big-buck-bunny_trailer.webm", true);
  oReq.responseType = "arraybuffer";

  oReq.onload = function (oEvent) {
    var arrayBuffer = oReq.response;
    if (arrayBuffer) {
      var byteArray = new Uint8Array(arrayBuffer);
      // call the function that will actually play the buffer
      play_buffer_callback(evt, sourceBuffer, byteArray, mediaEl);      

    } // if arrayBuffer
  }; // oReq onload
  oReq.send(null);
}


function play_testfile() {

  const el = document.getElementById('testdiv');
  init_player(el, undefined);

}

window.addEventListener("load", play_testfile());

// just for testing
function handleEvent(evt) {
//  console.log('debug event: ', evt);
}


export function init_player(pipe_el, data_callback) {
  // create log
  let loge = document.createElement('pre');
  pipe_el.appendChild(loge);

  function log (msg)  {
    for (var i = 0, j = arguments.length; i < j; i++){
       // var txt = document.createTextNode(arguments[i]+' ');
       // loge.appendChild(txt);
        var alltext =alltext + arguments[i]+ ' -- ';
    }
    var br = document.createTextNode(alltext + "\n");
    loge.appendChild(br);
    log('hello!'); 
  }

  // create audioplayer
  const mediaEl = document.createElement('audio');
   mediaEl.addEventListener('waiting', handleEvent);

  mediaEl.addEventListener('play', handleMediaEl_init);
  mediaEl.addEventListener('emptied', handleEvent);
  mediaEl.addEventListener('load', handleEvent);
  mediaEl.addEventListener('loadstart', handleEvent);
  mediaEl.addEventListener('progress', handleEvent);
  mediaEl.addEventListener('canplay', handleEvent);
  mediaEl.addEventListener('canplaythrough', handleEvent);
  mediaEl.addEventListener('error', function (evt){
    console.log('mediaEl error: ', evt);
    console.log(evt.target.src);
    URL.revokeObjectURL(evt.target.src);
    evt.target.removeAttribute('src');
    console.log('should be nonexistant: ', evt.target.src);
    handleMediaEl_init(evt);
    //document.setTimout(evt.target.play(), 1000);


    // remove all sourcebuffers
//    document.setTimout(evt.target.load(), 1000);
  });


  mediaEl.autoplay = true;
  mediaEl.controls = true;

  mediaEl.play();
  // reset to initial state, so mediaSource can be loaded
  //mediaEl.load();

    
  //audio.setAttribute('id', id);
  pipe_el.appendChild(mediaEl);
 
  console.log('end init_player');
}//init_player

  ///...
/*
 
  mediaSource.addEventListener('sourceopen', function(e) { console.log('sourceopen: ' + mediaSource.readyState); });
  mediaSource.addEventListener('sourceended', function(e) { console.log('sourceended: ' + mediaSource.readyState); });
  mediaSource.addEventListener('sourceclose', function(e) { console.log('sourceclose: ' + mediaSource.readyState); });
  mediaSource.addEventListener('error', function(e) { 
    console.log('error: ' + mediaSource.readyState);
 
  });

*/
