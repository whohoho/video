//if(typeof require != "undefined" && typeof libopus == "undefined"){
//const LIBOPUS_WASM_URL = "opus/libopus.wasm";
//const libopus = require("opus/libopus.wasm.js");
//import * as libopus from "./opus/libopus.js";
import Module from "./opus/libopus-standalone4.js";
//import * as libopus from "./opus/libopus-standalone4.js";
//console.log(libopus);

//}


class OpusProcessor extends AudioWorkletProcessor {

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
		//importScripts('opus/libopus.wasm.js');

    console.log('new audioencoder: ', Module);

    // const LIBOPUS_WASM_URL = "opus/libopus.wasm";
   // const libopus = require("opus/libopus.wasm.js");

    //libopus.onload();
    console.log(options.numberOfInputs)
//    console.log(options.processorOptions.someUsefulVariable)
    // setup encoder
     this.enc = Module.Encoder_new();
    console.log(this.enc);

  // this.enc = new Module.Encoder(1,48000,24000,20,false);
 
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
