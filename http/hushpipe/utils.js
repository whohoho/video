const isDebug = true


if (isDebug) var debug = console.log.bind(window.console)
else var debug = function(){}

var warn = console.log.bind(window.console)

function usermedia_success( stream ) {
  document.tryingtogetstream = false;
  //console.log('stream success', stream);

  var elem = document.getElementById('hushpipe_capture_controls');
  var videl =   document.createElement('video');
  videl.muted = true;
  videl.controls = true;
  videl.srcObject = stream;
  videl.width = 240;
  videl.height = 160;
  elem.appendChild(videl);
  create_vu(stream, elem);

  document.capturestream = stream;
  
}


function fixupconstraints() {
// FIXME: this should get a bunch of checking whether or not a constraint is supported
 
  var elem = document.getElementById('hushpipe_capture_controls');
  var cam = elem.querySelector("#camselect").value;
  var mic = elem.querySelector("#micselect").value;
  var cammute = elem.querySelector("#videomute").checked;
  var micmute = elem.querySelector("#audiomute").checked;
  
  //console.log('dev: ', cam, mic, cammute, micmute);

  const vc = {
    deviceId: cam,
    width: {min: 320, max: 1280},
    height: {min: 240, max: 720},
  }; 
  const ac = {
    deviceId: mic, 
    noiseSuppression: true,
    latency: 0,
    echoCancellation: true,
    autoGainControl: true,
    channelCount: 1,
    sampleRate: 48000,
    sampleSize: 16,
  }; 

  //console.log('constr: ', vc, ac);

  const video = document.capturestream.getVideoTracks()[0]; 
  if ( video ) {
    video.applyConstraints(vc);
    //console.log('video settings: ', video.getSettings());
    if (cammute) {
      video.enabled = false;
    } else {
      video.enabled = true;
    }
  }

  const audio = document.capturestream.getAudioTracks()[0]; 
  if ( audio ) {
    audio.applyConstraints(ac);
    //console.log('audio settings: ', audio.getSettings());
    if (micmute) {
      audio.enabled = false;
    } else {
      audio.enabled = true;
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function start_stream() {

  var elem = document.getElementById('hushpipe_capture_controls');
  // if this is the first time someone tries to get a stream, start the stream
  if (document.capturestream == undefined && document.tryingtogetstream !== true ) {
     document.tryingtogetstream = true;
    console.log('getting a stream...');

    function usermedia_error (err) {
      console.log('um err: ', err, err.name);

      if(err.name === 'NotFoundError') {
        // FIXME: indicate this in ui / disable all cam / mic controls
        var noperm =   document.createElement('p');
        noperm.textContent = "not found";
        noperm.setAttribute('id', 'mediacapture_noperm');
        elem.appendChild(noperm);
      } else {
        var noperm =   document.createElement('p');
        noperm.textContent = err;
        noperm.setAttribute('id', 'mediacapture_noperm');
        elem.appendChild(noperm);

      }
    }
    var hasmic, hascam;
    if (window.MediaStreamTrack) {
      
      var sources = await navigator.mediaDevices.enumerateDevices();
        var videoSources = sources.filter(function (source) {
          return source.kind === 'videoinput';
        });
        if (videoSources.length > 0) {
        console.log('got video sources', videoSources);
        hascam = true;
        }
        var audioSources = sources.filter(function (source) {
          return source.kind === 'audioinput';
        });
        if (audioSources.length > 0) {
          console.log('got audio sources', audioSources);
          hasmic = true;
        }

    }
    var micperm = false, camperm = false;
    await navigator.permissions.query({name: 'microphone'})
      .then((permissionObj) => {
        micperm = permissionObj.state;
      })
      .catch((error) => {
        console.log('Got error :', error);
      })

   await  navigator.permissions.query({name: 'camera'})
      .then((permissionObj) => {
        camperm = permissionObj.state;
      })
      .catch((error) => {
        console.log('Got error :', error);
      })
    console.log('permissions mic/cam: ', micperm, camperm);
    var mic = false, cam = false;
    if ((micperm == "prompt" || micperm == "granted") && hasmic == true) {
      mic = true;
    } else {
        var noperm =   document.createElement('p');
        noperm.textContent = "You did not give permssion for microphone, if you want to use mic change that in your browser settings";
        noperm.setAttribute('class', 'mediacapture_noperm');
        elem.appendChild(noperm);
    }
    if ((camperm == "prompt" || camperm == "granted") && hascam == true )  { 
      cam = true;
    } else {
        var noperm =   document.createElement('p');
        noperm.textContent = "You did not give permssion for camera, if you want to use camera change that in your browser settings";
        noperm.setAttribute('class', 'mediacapture_noperm');
        elem.appendChild(noperm);
    }

    var cconstraints = {audio: mic, video: cam};
    console.log('cc: ', cconstraints);
    if (cam || mic) {
    navigator.webkitGetUserMedia( cconstraints, usermedia_success, usermedia_error);
    } else {
        var noperm =   document.createElement('p');
        noperm.textContent = "we have no capture devices, can't do capture";
        noperm.setAttribute('class', 'mediacapture_noperm');
        elem.appendChild(noperm);

    }
  } 
  if (document.capturestream) { // stream is workin, return it

    fixupconstraints();
    return document.capturestream;

  } else { // stream not created yet, wait for it, then return it
    await sleep(1);
    while (true){
      if (document.capturestream) 
      { 
        console.log("got a capturestream", document.capturestream); 
        fixupconstraints();
        return document.capturestream;
      };
      await sleep(10); 
    }

  }




}

export function formel(type, elem, name, callback) {
  if (type == 'select') {
    var cb = document.createElement("select");
  } else {
    var cb = document.createElement("input");
    cb.type = type;
  }
  const label = document.createElement("label");
  label.textContent = name;
  label.setAttribute('for',name);
  label.setAttribute('id', name + "_label");
  label.setAttribute('class', 'formthing');
  cb.setAttribute('id', name);

  elem.appendChild(cb);
  elem.appendChild(label);
  cb.onchange = callback; 
  return cb;
}

export function find_media_devices() {
  // List cameras and microphones.

  var elem = document.getElementById('hushpipe_capture_controls');
  formel('checkbox', elem, 'audiomute', start_stream);
  formel('checkbox', elem, 'videomute', start_stream);
  //formel('checkbox', elem, 'selfiecam');


  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
   console.log("enumerateDevices() not supported.");
   return;
  }
  
  //FIXME: only have it enumerate mics / cams
  navigator.mediaDevices.enumerateDevices()
  .then(function(devices) {
    const audioselect = formel('select', elem, 'micselect', start_stream);
    const videoselect = formel('select', elem, 'camselect', start_stream);

    audioselect.appendChild(new Option('default', 'default', true, true));
    videoselect.appendChild(new Option('default', 'default', true, true));

    devices.forEach(function(device) {
      if (device.kind == 'audioinput') {
        audioselect.appendChild(new Option(device.label, device.deviceId, false, false));
      }
      else if (device.kind == 'videoinput') {
        videoselect.appendChild(new Option(device.label, device.deviceId, false, false));
      } else {
        console.log(device.kind + ": " + device.label +
                    " id = " + device.deviceId);
      }
    });
    
  })
  .catch(function(err) {
    console.log(err.name + ": " + err.message);
  });



};

export function rendercstats (cstats, channel)  {
    var text = 'buff: ' + channel.bufferedAmount
               + '\nbufftresh: ' + channel.bufferedAmountLowThreshold
  /*
               + '\n id: ' + channel.id
               + '\n label: ' + channel.label
               + '\n label: ' + channel.maxPacketLifetime
               + '\n maxretransmits: ' + channel.maxRetransmits
               + '\n negotiated: ' + channel.negotiated
               + '\n ordered: ' + channel.ordered
               + '\n proto: ' + channel.protocol
               */
               + '\nreadyState: ' + channel.readyState
    
    var br = document.createTextNode(text + "\n");
    cstats.setAttribute('class', 'hushpipe_cstats');
    cstats.replaceChild(br, cstats.childNodes[0]);
  }

export async function please_encrypt(blob_event, t){
            try {
      var ciphertext = await t.encryptor(blob_event.data);
      } catch (err) { 
        warn('encryption failed', err); 
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

  }



export function create_vu(stream, elem) {
      // vu meter
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    const javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

    analyser.smoothingTimeConstant = 0.3;
    analyser.fftSize = 1024;

    microphone.connect(analyser);
    analyser.connect(javascriptNode);
    javascriptNode.connect(audioContext.destination);
    
    const canvas = document.createElement('canvas');

    const canvasContext = canvas.getContext("2d");
    javascriptNode.onaudioprocess = function() {
        var array =  new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);
        var values = 0;

        var length = array.length;
        for (var i = 0; i < length; i++) {
            values += array[i];
        }

        var average = values / length;
        canvasContext.clearRect(0, 0, 60, 130);
        canvasContext.fillStyle = '#00ff00';
        canvasContext.fillRect(0,130-average,25,130);
    }

    return canvas;


}




export class EventEmitter {
  constructor() {
    this._events = {};
  }

  on(name, listener) {
    if (!this._events[name]) {
      this._events[name] = [];
    }

    this._events[name].push(listener);
  }

  removeListener(name, listenerToRemove) {
    if (!this._events[name]) {
      throw new Error(`Can't remove a listener. Event "${name}" doesn't exits.`);
    }

    const filterListeners = (listener) => listener !== listenerToRemove;

    this._events[name] = this._events[name].filter(filterListeners);
  }

  emit(name, data) {
    if (!this._events[name]) {
      throw new Error(`Can't emit an event. Event "${name}" doesn't exits.`);
    }

    const fireCallbacks = (callback) => {
      callback(data);
    };

    this._events[name].forEach(fireCallbacks);
  }
}

export const rec_mimetypes = [
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



export function saveBlob(blob, name, auto) {

  
    var url=window.URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href=url;
    a.setAttribute('download', name);
    a.appendChild(document.createTextNode('download' + name + "--" ));
    document.getElementById('debug').appendChild(a);
    if (auto) {
      a.click();
    }
    //TODO: cleanup blob
}

