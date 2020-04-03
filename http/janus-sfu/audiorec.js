
let chunks = [];
const AUDIO_CONSTRAINTS = {audio: true, video: true};
const AUDIO_MIME = 'audio/webm;codecs=opus';
const VIDEO_CONSTRAINTS = {video: true};
const VIDEO_MIME = 'video/webm;codecs=vp8';


const BUF_SIZE = 1;
const AUDIO_RECOPT = { 
        //audioBitsPerSecond :  256000,
	      //videoBitsPerSecond : 2500000,
	      //bitsPerSecond:       2628000,
//	      mimeType : AUDIO_MIME,
        timeslice: 100,
 	    };

const VIDEO_RECOPT = { audioBitsPerSecond :  256000,
	      //videoBitsPerSecond : 2500000,
	      //bitsPerSecond:       2628000,
//	      mimeType : VIDEO_MIME,
        timeslice: 10,
 	    };


  function randomChars() {
    let string = "";
    let choices = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";

    for (let i = 0; i < 8; i++) {
      string += choices.charAt(Math.floor(Math.random() * choices.length));
    }
    return string;
  }

function makeMediaStream(inputstream, recopts) {
	var recorder;
  console.log(inputstream);
 if (inputstream instanceof MediaStream) {
   console.log('inputstream == MediaStream');
 }


  recorder = new MediaRecorder(inputstream, recopts);

  console.log("new mediarecorder created: ");
  console.log(recorder);

  function la (event){
    controller.enqueue(event.data);
    console.log(event.data);
    return data
  }

  return new ReadableStream({
    start(controller) {
      media = getMedia({video: true});
      interval = setInterval(() => {
        let string = randomChars();

        // Add the string to the stream
        controller.enqueue(string);

        // show it on the screen
        let listItem = document.createElement('li');
        listItem.textContent = string;
        document.body.appendChild(listItem);
      }, 1000);

      /*
      button.addEventListener('click', function() {
        clearInterval(interval);
        readStream();
        controller.close();
      })
      */
    },
    pull(controller) {
      // We don't really need a pull in this example
    },
    cancel() {
      // This is called if the reader cancels,
      // so we should stop generating strings
      clearInterval(interval);
    }
  });

/*
  return new ReadableStream({
    pull(controller) {
      controller.enqueue('wtf');
      console.log('pulled');
  //    controller.enqueue(recorder.requestData());
      recorder.start();
    },
    start(controller) {
      console.log("stream has started");
      console.log(recorder.state);
      
      recorder.ondataavailable = function (ev) {
          controller.enqueue('wtf');

        //controller.enqueue(ev.data);
        console.log('rec data');
        console.log(ev.data);
      };

      recorder.onclose = () => controller.close();
      recorder.onerror = () => controller.error(new Error("audiorecorder error"));
      recorder.start();
//      console.log(recorder.ondataAvailable);
      console.log(recorder.state);
      console.log("mediarecorder started: ");
      console.log(recorder);
 //     console.log(recorder.requestData());
    },

    cancel() {
      console.log('stream cancelled');
      recorder.stop();
    }
  });
  */
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

    mediaEl.srcObject = stream;
    //mediaEl.src = stream;

    document.body.appendChild(mediaEl);
/*  let response = new Response(stream);
  (response.blob())
  .then(blob => URL.createObjectURL(blob))
  .then(url => mediaEl.src = url )
  .catch(err => console.error(err));
  console.log("now the audio should play");
*/
}
function insertBlobPlayer (stream) {
    var mediaEl = document.createElement("video");
    mediaEl.controls = true;
    mediaEl.autoplay = true;
    mediaEl.play = true;
    document.body.appendChild(mediaEl);


  let response = new Response(stream);
  (response.blob())
  .then(blob => URL.createObjectURL(blob))
  .then(url => mediaEl.src = url )
  .catch(err => console.error(err));
  console.log("now the audio should play");
  console.log(stream);
  console.log(stream);

}




async function init(constraints) {
}


async function test () {

  try {
    const audioin = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
    console.log('getUserMedia() got stream:', audioin);
    insertPlayer(audioin);
    let audiostream = await makeMediaStream(audioin, AUDIO_RECOPT);
      const reader = audiostream.getReader();
      reader.read().then(function processText({ done, value }) {
        console.log('value of stream read',value);
    // Result objects contain two properties:
    // done  - true if the stream has already given you all its data.
    // value - some data. Always undefined when done is true.
    if (done) {
      console.log("Stream complete");
      return;
    }
      });
    console.log("we have audio, trying to play");
    //insertBlobPlayer(audiostream);

  } catch (e) {
    console.error('navigator.getUserMedia error:', e);
    //errorMsgElement.innerHTML = `navigator.getUserMedia error:${e.toString()}`;
  }

 /* 
  let videoin = await getMedia(VIDEO_CONSTRAINTS);
  insertPlayer(videoin);

  let videostream = await makeMediaStream(videoin, VIDEO_RECOPT);
  console.log("we have video, trying to play");
  insertPlayer(videostream);
*/
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

