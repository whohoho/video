
let chunks = [];
const AUDIO_CONSTRAINTS = {audio: true};
const AUDIO_MIME = 'audio/webm;codecs=opus';
const BUF_SIZE = 1;
const AUDIO_RECOPT = { audioBitsPerSecond :  256000,
	      videoBitsPerSecond : 2500000,
	      bitsPerSecond:       2628000,
	      mimeType : AUDIO_MIME,
	    };

function makeAudioStream(mediastream) {
	var recorder;
 
  recorder = new MediaRecorder(mediastream, AUDIO_RECOPT);
  

  return new ReadableStream({
    start(controller) {
      recorder.ondataavailable = event => controller.enqueue(event.data);
      recorder.onclose = () => controller.close();
      recorder.onerror = () => controller.error(new Error("audiorecorder error"));
    },

    cancel() {
      recorder.stop();
    }
  });
}


async function getMedia(constraints) {
  let stream = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
    return stream;
  } catch (err) { console.log("getmediastream failed"); } 
  console.log("getUserMedia() success, stream created, initializing MediaRecorder");  
}; 

function insertPlayer (stream) {

    var mediaEl = document.createElement("audio");
//    mediaEl.className = 'media-' + otherId;
    mediaEl.controls = true;
    mediaEl.autoplay = true;
    mediaEl.srcObject = stream;
    document.body.appendChild(mediaEl);

}

async function test () {

  let stream = await getMedia(AUDIO_CONSTRAINTS);

  let audioelement = document.getElementById("testaudio")
  let stream2 = await makeAudioStream(stream);
  insertPlayer(stream);
  console.log("we have audio, trying to play");
  let response = new Response(stream2);
  (response.blob())
  .then(blob => URL.createObjectURL(blob))
  .then(url => audioelement.src = url )
  .catch(err => console.error(err));



};

test();
/*
function startrecording () {
	navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS).then(function(stream) {
		console.log("getUserMedia() success, stream created, initializing MediaRecorder");
    
    recorder = new MediaRecorder(stream, AUDIO_RECOPT);

	    recorder.ondataavailable = function(e){
	    	console.log("recorder.ondataavailable:" + e.data);
	    	console.log ("recorder.audioBitsPerSecond:"+recorder.audioBitsPerSecond)
	    	console.log ("recorder.videoBitsPerSecond:"+recorder.videoBitsPerSecond)
	    	console.log ("recorder.bitsPerSecond:"+recorder.bitsPerSecond)
	      
        chunks.push(e.data);
        

        if (recorder.state == 'inactive') {
          console.log('rec finished');
        }
	    };

	    recorder.onerror = function(e){
	    	console.log(e.error);
	    };

	    //start recording using 1 second chunks
	    //Chrome and Firefox will record one long chunk if you do not specify the chunck length
	    recorder.start(1000);
  });
};
*/
//startrecording();

