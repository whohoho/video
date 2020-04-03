strict: true;

navigator.getUserMedia({audio:true, video:true}, function(stream){
  console.log('streaming');
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    microphone = audioContext.createMediaStreamSource(stream);
    javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

    analyser.smoothingTimeConstant = 0.3;
    analyser.fftSize = 1024;

    microphone.connect(analyser);
    analyser.connect(javascriptNode);
    javascriptNode.connect(audioContext.destination);

    canvasContext = document.getElementById('canvas').getContext("2d");

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
},e=>console.log('navigator.getUserMedia err:',e)
);

