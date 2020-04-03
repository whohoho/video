//const ws = new WebSocket(someWsUrl);


function insertBlobPlayer (stream) {


      const reader = stream.getReader();

      reader.read().then(function processText({ done, value }) {
        console.log('value of stream read',value);
        return reader.read().then(processText);

        if (done) {
          console.log("Stream complete");
          return;
          }
      });

/*

    var mediaEl = document.createElement("video");
    mediaEl.controls = true;
    mediaEl.autoplay = true;
    mediaEl.play = true;
 //   mediaEl.src = stream;
    document.body.appendChild(mediaEl);


  let response = new Response(stream);
  (response.blob())
  .then(blob => URL.createObjectURL(blob))
  .then(url => mediaEl.src = url )
  .catch(err => console.error(err));
  console.log("now the audio should play");
  console.log(stream);
*/
}





let videostream =  new ReadableStream({
    start(controller) {
       navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(function(stream) {
      const recorderOptions = {
        mimeType: 'video/webm',
        videoBitsPerSecond: 200000 // 0.2 Mbit/sec.
      };
      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorder.start(1000); // 1000 - the number of milliseconds to record into each Blob
      mediaRecorder.ondataavailable = (event) => {
        console.debug('Got blob data:', event.data);
        if (event.data && event.data.size > 0) {
          console.log(event.data);
          controller.enqueue(event.data);
        }
      };

      }).catch(function(err) {
      console.log('error', err);
      });
           
    },
    pull(controller) {
      // We don't really need a pull in this example
    },
    cancel() {
      // This is called if the reader cancels,
      // so we should stop generating strings
      mediaRecorder.stop();
    }
  });



insertBlobPlayer(videostream);
