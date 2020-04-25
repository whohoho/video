const isDebug = true


if (isDebug) var debug = console.log.bind(window.console)
else var debug = function(){}

var warn = console.log.bind(window.console)


export function rendercstats (cstats, channel)  {
    var text =         channel.binaryType
               + '\n buff: ' + channel.bufferedAmount
               + '\n bufftresh: ' + channel.bufferedAmountLowThreshold
               + '\n id: ' + channel.id
               + '\n label: ' + channel.label
               + '\n label: ' + channel.maxPacketLifetime
               + '\n maxretransmits: ' + channel.maxRetransmits
               + '\n negotiated: ' + channel.negotiated
               + '\n ordered: ' + channel.ordered
               + '\n proto: ' + channel.protocol
               + '\n readyState: ' + channel.readyState

               + '\n -- ';
    var br = document.createTextNode(text + "\n");
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
        t.channel.send(ciphertext);
      } catch (err) { warn('send failed: ', err) }

  }



export function create_vu(stream, t) {
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

    t.status_el.appendChild(canvas);

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

