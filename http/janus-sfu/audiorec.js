
let chunks = [];
const AUDIO_CONSTRAINTS = {audio: true};
const AUDIO_MIME = 'audio/webm;codecs=opus';
const VIDEO_CONSTRAINTS = {video: true};
const VIDEO_MIME = 'video/webm;codecs=vp8';


const BUF_SIZE = 1;
const AUDIO_RECOPT = { 
        //audioBitsPerSecond :  256000,
	      //videoBitsPerSecond : 2500000,
	      //bitsPerSecond:       2628000,
	      mimeType : AUDIO_MIME,
        timeslice: 100,
 	    };

const VIDEO_RECOPT = { audioBitsPerSecond :  256000,
	      //videoBitsPerSecond : 2500000,
	      //bitsPerSecond:       2628000,
	      mimeType : VIDEO_MIME,
        timeslice: 10,
 	    };


function makeMediaStream(inputstream, recopts) {
	var recorder;
 
  recorder = new MediaRecorder(inputstream, recopts);
  console.log("new mediastream created");

  function la (event){
    controller.enqueue(event.data);
    console.log(event.data);
    return data
  }

  return new ReadableStream({
    start(controller) {
      console.log("stream has started");
      console.log(recorder.state);
      recorder.ondataavailable = function (ev) {
        controller.enqueue(ev.data);
        console.log('rec data');
        console.log(ev.data);
      };

      recorder.onclose = () => controller.close();
      recorder.onerror = () => controller.error(new Error("audiorecorder error"));
      recorder.start();
//      console.log(recorder.ondataAvailable);
      console.log(recorder.state);
//      console.log(recorder.requestData());

    },

    cancel() {
      recorder.stop();
    }
  });
}


async function getMedia(constraints) {
  let stream = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream;
  } catch (err) { console.log("getmediastream failed"); } 
  console.log("getUserMedia() success, stream created, initializing MediaRecorder" + constraints);  
}; 

function insertPlayer (stream) {


    var mediaEl = document.createElement("video");
    mediaEl.controls = true;
    mediaEl.autoplay = true;
    mediaEl.play = true;

//    mediaEl.srcObject = stream;
    //mediaEl.src = stream;

    document.body.appendChild(mediaEl);
  let response = new Response(stream);
  (response.blob())
  .then(blob => URL.createObjectURL(blob))
  .then(url => mediaEl.src = url )
  .catch(err => console.error(err));
  console.log("now the audio should play");

}

async function test () {

  let audioin = await getMedia(AUDIO_CONSTRAINTS);
  let audiostream = await makeMediaStream(audioin, AUDIO_RECOPT);
  console.log("we have audio, trying to play");
  insertPlayer(audiostream);

  let videoin = await getMedia(VIDEO_CONSTRAINTS);
  let videostream = await makeMediaStream(videoin, VIDEO_RECOPT);
  console.log("we have video, trying to play");
  insertPlayer(videostream);
/*
  let response = new Response(stream2);

  (response.blob())
  .then(blob => URL.createObjectURL(blob))
  .then(url => audioelement.src = url )
  .catch(err => console.error(err));
*/


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

