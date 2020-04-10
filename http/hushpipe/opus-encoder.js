if(typeof require != "undefined" && typeof libopus == "undefined"){
const LIBOPUS_WASM_URL = "opus/libopus.wasm";
const libopus = require("opus/libopus.wasm.js");
//import * as libopus from "./opus/libopus.wasm.js";
}



class OpusProcessor extends AudioWorkletProcessor {

  var importObject = {
  imports: {
    imported_func: function(arg) {
      console.log(arg);
    }
  }
  };

  static get parameterDescriptors () {
      return [{
        name: 'bitrate',
        defaultValue: 1,
        minValue: 0,
        maxValue: 1,
        automationRate: 'a-rate'
      }]
    }


  constructor (options) {
    super()
    console.log('new audioencoder: ', options);

    WebAssembly.instantiateStreaming(fetch('opus/libopus.wasm'), importObject)
    .then(obj => {
      // Call an exported function:
      obj.instance.exports.exported_func();

      // or access the buffer contents of an exported memory:
      var i32 = new Uint32Array(obj.instance.exports.memory.buffer);

      // or access the elements of an exported table:
      var table = obj.instance.exports.table;
      console.log(table.get(0)());
    })

   // const LIBOPUS_WASM_URL = "opus/libopus.wasm";
   // const libopus = require("opus/libopus.wasm.js");

    //libopus.onload();
    console.log(options.numberOfInputs)
//    console.log(options.processorOptions.someUsefulVariable)
    // setup encoder
   this.enc = new libopus.Encoder(1,48000,24000,20,false);
 
   // setup decoder
   // var dec = new libopus.Decoder(1,48000);


    this.port.onmessage = (e) => {
      console.log(e.data)
      //this.port.postMessage('pong')
    }
  }

  /*
   * Although not defined on the interface, the deriving class must have the process method. This method gets called for each block of 128 sample-frames and takes input and output arrays and calculated values of custom AudioParams (if they are defined) as parameters. You can use inputs and audio parameter values to fill the outputs array, which by default holds silence.
   */

  process (inputs, outputs, parameters) {
    //console.log('p');
    let rate = parameters['bitrate'][0]
      //      (parameters['customGain'].length > 1 ? parameters['customGain'][i] : parameters['customGain'][0])
      // note: a parameter contains an array of 128 values (one value for each of 128 samples),
      // however it may contain a single value which is to be used for all 128 samples
      // if no automation is scheduled for the moment.
    //this.enc.input(samples);
    //var data = enc.output();
    //this.port.postMessage(data);
    this.port.postMessage('hello!');
    // lala
    const output = outputs[0]
    output.forEach(channel => {
      for (let i = 0; i < channel.length; i++) {
        channel[i] = Math.random() * 2 - 1
      }
    })
    return true
  }

}

registerProcessor('opus-encoder', OpusProcessor)
