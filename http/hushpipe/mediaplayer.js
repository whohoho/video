

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
  console.log(mediaEl);
  const buffer = evt.target.addSourceBuffer(mediaEl.parentNode.MIMETYPE);

  buffer.mode = 'sequence';

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
  var cb = sb_callback;
  mediaEl.parentNode.CALLBACK = sb_callback;
 
  window.setInterval(console.log(cb),1000);


} // mediaSource_sourceopen



// this should be called when there is a new mediaelement, or when the mediaelement has been reset with load()
function handleMediaEl_init(evt) {
  //    eventLog.textContent = eventLog.textContent + `${event.type}\n`;
  console.log('MediaEl_init: ', evt, evt.target);
  // check if mime is supported
  if (! 'MediaSource' in window && MediaSource.isTypeSupported(evt.target.parentNode.MIMETYPE)) {
    console.log('unsupported format', evt.target.parentNode.MIMETYPE);
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
  //if (sourceBuffer.mode != 'segments')
  //  throw 'video is not segments WHAT\nx\nx\nx';
  if (sourceBuffer.error) // then we should wait
    throw 'video is ERRORed WHAT\ngx\nx\nx';
  if (sourceBuffer.updating){
    //
    // Technically speaking we should wait, instead we just drop frames
    //
    //throw 'buf is updating, while we want to put something in it'
    sourceBuffer.addEventListener('updateend', function () {
      //try { video_element.buf.appendBuffer(plaintext);}catch(e){}
    }, { once: true, passive: true });
  } else { //not updating and no errors

    //console.log(sourceBuffer, evt);

    function doappend()
    {

      if (sourceBuffer) {
        //console.log('adding', mediaEl.msrc);
        if (!evt.data) {
          //console.log('testing: ', evt.detail);
         var uint8View = new Uint8Array(evt.detail);

        } else {
          //console.log('dc data: ', evt.data)
         var uint8View = new Uint8Array(evt.data);
        }
        //console.log('dc data: ', uint8View)

        sourceBuffer.appendBuffer(uint8View);
      } else {
        console.log('for some\n\nx\n\nx\n\n\nx fucking reason no buffer');
      }
    } // doappend

    if (mediaEl.updating) {
      mediaEl.msrc.addEventListener(
        'updateend',
        e => { console.log('updateend'); doappend(); },
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

  mediaEl.parentNode.DATACHANNEL.addEventListener("message", function(evt){
  //  console.log('got message');
      play_buffer_callback(evt, sourceBuffer, undefined, mediaEl);      

  });

}


function play_testfile() {

  
  class fakeDataChannel extends EventTarget {
    constructor(url) {
      super();
      this._url = url;
    }
    get url() { return this._url; }
  };
  

  let dc = new fakeDataChannel(undefined);
  dc.addEventListener("message", function(e) {
    console.log('fake message', e);
  });

  const el = document.getElementById('testdiv');
  // set some config
  el.TYPE = 'video';
  el.MIMETYPE = 'video/webm;codecs=vp8,vorbis';
  el.DATACHANNEL = dc;

  function send_fake_msg(dc, file) {
    var oReq = new XMLHttpRequest();
    oReq.open("GET", file, true);
    oReq.responseType = "arraybuffer";
    oReq.onload = function (oEvent) {
      console.log(oEvent);

    if (oEvent.target.status == 200) {
      var arrayBuffer = oReq.response;
      if (arrayBuffer) {
        var byteArray = new Uint8Array(arrayBuffer);
/*        let event = new CustomEvent("message", { 
          detail: "werkt dit??",
          data: byteArray, 
          hello: "hello!" }), data = byteArray; */
       console.log("sending: ", oEvent.target.responseURL);

        let event = new CustomEvent("message", {detail: byteArray}), data = byteArray, lala = true;

        dc.dispatchEvent(event);
        // call the function that will actually play the buffer
      } // if arrayBuffer
    }// if 200
    }; // oReq onload
    oReq.send(null);
  }

  init_player(el, dc);
//  window.setInterval(function () { send_fake_msg(dc); }, 1000);
  send_fake_msg(dc, "big-buck-bunny_trailer.webm");
  let fc = 0; 
  window.setInterval(function () { 
   let fn = "testclips/chunk_vid_" + fc + ".webm";
   send_fake_msg(dc, fn);
    fc += 1;
  }, 5000);
  console.log('test started');

}

window.addEventListener("load", play_testfile());

// just for testing
function handleEvent(evt) {
  //  console.log('debug event: ', evt);
}


export function init_player(pipe_el) {
  // define some constants
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

  // create mediaplayer
  const mediaEl = document.createElement(pipe_el.TYPE);
  mediaEl.addEventListener('waiting', handleEvent);

  mediaEl.addEventListener('play', handleMediaEl_init);
  mediaEl.addEventListener('emptied', handleEvent);
  mediaEl.addEventListener('load', handleEvent);
  mediaEl.addEventListener('loadstart', handleEvent);
  mediaEl.addEventListener('progress', handleEvent);
  mediaEl.addEventListener('canplay', handleEvent);
  mediaEl.addEventListener('canplaythrough', handleEvent);
  mediaEl.addEventListener('error', function (evt){
    // restart the player when there is an error
    
    mediaEl.parentNode.DATACHANNEL.addEventListener('message', function (event) {
      event.stopPropagation();
    }, true); 
   
    console.log('mediaEl error: ', evt);
    console.log(evt.target.src);
    URL.revokeObjectURL(evt.target.src);
    evt.target.removeAttribute('src');
    console.log('should be nonexistant: ', evt.target.src);
    handleMediaEl_init(evt);
  });


  mediaEl.autoplay = true;
  mediaEl.controls = true;

  mediaEl.play();
  
  // reset to initial state, so mediaSource can be loaded
  //mediaEl.load();

  //audio.setAttribute('id', id);
  pipe_el.appendChild(mediaEl);

  console.log('end init_player');
  console.log(mediaEl.parentNode.CALLBACK);

  return mediaEl.parentNode.CALLBACK;

}//init_player


