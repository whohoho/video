/**
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

// Basic byte unit of WASM heap. (16 bit = 2 bytes)
const BYTES_PER_UNIT = Uint16Array.BYTES_PER_ELEMENT;

// Byte per audio sample. (32 bit float)
const BYTES_PER_SAMPLE = Float32Array.BYTES_PER_ELEMENT;

// The max audio channel on Chrome is 32.
const MAX_CHANNEL_COUNT = 32;

// WebAudio's render quantum size.
const RENDER_QUANTUM_FRAMES = 128;


export class JitterBuffer {
  /** FIXME: actually check if this thing works (probably full of mistakes)
   * The point of this buffer is to deal with variation in interpacketdelay.
   * its clocked by the audio card
   * it works with fixed size (and time) packets, so seqnums should increase on the clock
   * It should have a sensible buffer amount at start, and adapt the size of the buffer to network condition (late packets). 
   * when a packets arrives late (seqin => seqout), increase the size
   * when seq is not in buffer (or has to stay in), return null pointer (to instruct opus to do plc)
   * packets only go out, when seqin - seqout = size
   * when packet comes in and seqin = 0, seqin will be the seq of that packet and seqout will be seqout + size (to make playing only start when there is enough buffered)
   * when a packet comes in and packetseq < seqin, then packet is out of order, or stream has restarted, 
       figure out which one is the case, if stream got restarted, jitterbuffer should reset seqin / seqout
   */ 

  constructor() {
    this.pulls = 0;
   this.clock = 0;
  // buffer slots, this is the size of the buffer / latency
   // initial ~ 100ms
   this.numslots = 10;
   this.maxslots = 300;
   //packets that where not there when they shoud have been played
   this.notfound = 0;
   // packets that came in after they should have been played
   this.late = 0;
   // dropped packets = notfound - late
   this.found = 0;
   // seq < seqin 
   this.outoforder = 0;
   // highest sequence number in buffer
   this.seqin = null;
   //last seq that was played (that includes packets that where not available at the time of playing)
   this.seqout = null;
   // first seqnum in buffer
   this.position = null;
  // increase delay, set this to have the next packet read be silence (to increase delay)
  this.increase = false;
  // apperently a javascript array is not an array anyway, so this is easier
  this.slots = {}
    //seqout - 1 is the first element in the slots array
    // slots[0], is the packet that should be played
    //when a slot has been send to play, make it null
    //    -1  |   0  |   1  |    2   |
    // seqout |      |      |  seqin |

  }
  insert(seq, packet) {
    //console.log('inserting: ', seq, packet);
    this.slots[seq] = packet;
  }

  find(seq) {
    if (this.slots.hasOwnProperty(seq)) {
      //console.log('found', seq, this.numbuffered());
      this.found += 1;
      var ret = this.slots[seq];
      delete this.slots[seq];
      return ret;
    } else {
      // we never got that packet
      //console.log('not found found: ', seq, this.numbuffered());
      this.notfound += 1;
      return null;
    }
  }
  numbuffered() {
    return Object.keys(this.slots).length;
  }
  /**
   * receive a packet
   */
  push(seq, buffer){
//    console.log('got packet', seq, this.seqout, this.seqin, this.numslots);
    /*
    if ((this.seqout < 1) && this.seq < (this.seqout - this.numslots) ) {
      console.log('initial filling ', seq, this.seqin, this.seqout, this.numslots);
      return;
    }
    */
    if (this.seqin == null){
      // first packet we receive
      this.seqin = seq;
      this.seqout = seq; // we should start playing with the first packet we receive
      //console.log('got first packet seq, in, out, num', seq, this.seqin, this.seqout, this.numslots);
      
    }

    if (! seq == this.seqin + 1) {
      console.log('not the next packet, missing one');
    }
    /*
    if (seq < this.seqin) {
      // out of order packet, drop it FIXME
      console.log('dropping out of order packet with seq, in, out, numslots: ', seq, this.seqin, this.seqout, this.numslots);
    } else {
     */ 
    if (seq < this.seqout){
      //this also happens when a packet gets received twice, 1 in time and 1 late
      this.increase = true;
      this.late += 1;
     // console.log('late packet, dropping, setting increase', seq, this.seqin, this.seqout, this.increase);
      return;
    }
    
    // normal in order packet

    if ( seq > this.seqin) {
      this.seqin = seq
    } else {
      console.log('out of order');
      this.outoforder += 1;
    }
    this.insert(seq, buffer);
    //console.log('uyhm');
    return;

  }
  /**
   * ask for a packet to play
   */
  pop(){
    // for debuggin messag3
    this.pulls += 1;

    //console.log('jitter status', this.seqin, this.seqout, this.numslots, this.clock, this.pulls, this.increase);
    /*
    if ( this.pulls % 100 == 0 )
    {
      console.log('jitter stats\n in: ', this.seqin, 
        '\n out: ', this.seqout, 
        '\n slots: ', this.numslots, 
        '\n notfound: ', this.notfound,
        '\n late: ', this.late, 
        '\n found: ', this.found,
        '\n outoforder: ', this.outoforder,
        '\n loss %: ', (((this.notfound - this.late) / this.found)  * 100),
        '\n late %: ', ((this.late / this.found)  * 100)
     
      );
    }
    */
    if (this.seqin != null) {
      // start counting when first packet arrives, don't count when we increase buffer size
      this.clock += 1;
    } 
    //FIXME: figure out when to decrease (early packet count?? if > 10 in a row very early?)
    if (this.decrease) {
      this.numslots -= 1;
      this.decrease = false;
    }

    if (this.increase) {
      if (this.numslots < this.maxslots) {
        this.numslots += 1;
      }
      this.increase = false;
//      console.log('increasing buff', this.seqin, this.seqout, this.numslots, this.clock, this.pulls, this.increase);
      // we are increasing buffersize, so that means playing silence
      // there is nothing to be played (call opus with zero length and null pointer)
      return null;
    }


    //console.log('la: out >   ', this.seqout, (this.seqin - this.numslots) );
    if ((this.seqout) > (this.seqin - this.numslots)) {
      //FIXME: this can also happen during playing, figure out if that makes sense
      //console.log('buffer not filled yet, waiting with playing: in, out, num', this.seqin, this.seqout, this.numslots);
      return null;
    } else {
      //console.log('initially filled (out should be 1 (or first seq we got), cause 1 is the first packet), in, out', this.seqin, this.seqout);
      //
      // enough range in buffer, so we can play
      this.seqout += 1;
     return this.find(this.seqout - 1);
 
    }
  }

}



/**
 * A WASM HEAP wrapper for AudioBuffer class. This breaks down the AudioBuffer
 * into an Array of Float32Array for the convinient WASM opearion.
 *
 * @class
 * @dependency Module A WASM module generated by the emscripten glue code.
 */
class HeapAudioBuffer {
  /**
   * @constructor
   * @param  {object} wasmModule WASM module generated by Emscripten.
   * @param  {number} length Buffer frame length.
   * @param  {number} channelCount Number of channels.
   * @param  {number=} maxChannelCount Maximum number of channels.
   */
  constructor(wasmModule, length, channelCount, maxChannelCount) {
    // The |channelCount| must be greater than 0, and less than or equal to
    // the maximum channel count.
    this._isInitialized = false;
    this._module = wasmModule;
    this._length = length;
    this._maxChannelCount = maxChannelCount
        ? Math.min(maxChannelCount, MAX_CHANNEL_COUNT)
        : channelCount;
    this._channelCount = channelCount;
    this._allocateHeap();
    this._isInitialized = true;
  }

  /**
   * Allocates memory in the WASM heap and set up Float32Array views for the
   * channel data.
   *
   * @private
   */
  _allocateHeap() {
    const channelByteSize = this._length * BYTES_PER_SAMPLE;
    const dataByteSize = this._channelCount * channelByteSize;
    this._dataPtr = this._module._malloc(dataByteSize);
    this._channelData = [];
    for (let i = 0; i < this._channelCount; ++i) {
      let startByteOffset = this._dataPtr + i * channelByteSize;
      let endByteOffset = startByteOffset + channelByteSize;
      // Get the actual array index by dividing the byte offset by 2 bytes.
      this._channelData[i] =
          this._module.HEAPF32.subarray(startByteOffset >> BYTES_PER_UNIT,
                                        endByteOffset >> BYTES_PER_UNIT);
    }
  }

  /**
   * Adapt the current channel count to the new input buffer.
   *
   * @param  {number} newChannelCount The new channel count.
   */
  adaptChannel(newChannelCount) {
    if (newChannelCount < this._maxChannelCount) {
      this._channelCount = newChannelCount;
    }
  }

  /**
   * Getter for the buffer length in frames.
   *
   * @return {?number} Buffer length in frames.
   */
  get length() {
    return this._isInitialized ? this._length : null;
  }

  /**
   * Getter for the number of channels.
   *
   * @return {?number} Buffer length in frames.
   */
  get numberOfChannels() {
    return this._isInitialized ? this._channelCount : null;
  }

  /**
   * Getter for the maxixmum number of channels allowed for the instance.
   *
   * @return {?number} Buffer length in frames.
   */
  get maxChannelCount() {
    return this._isInitialized ? this._maxChannelCount : null;
  }

  /**
   * Returns a Float32Array object for a given channel index. If the channel
   * index is undefined, it returns the reference to the entire array of channel
   * data.
   *
   * @param  {number|undefined} channelIndex Channel index.
   * @return {?Array} a channel data array or an
   * array of channel data.
   */
  getChannelData(channelIndex) {
    if (channelIndex >= this._channelCount) {
      return null;
    }

    return typeof channelIndex === 'undefined'
        ? this._channelData : this._channelData[channelIndex];
  }

  /**
   * Returns the base address of the allocated memory space in the WASM heap.
   *
   * @return {number} WASM Heap address.
   */
  getHeapAddress() {
    return this._dataPtr;
  }

  /**
   * Frees the allocated memory space in the WASM heap.
   */
  free() {
    this._isInitialized = false;
    this._module._free(this._dataPtr);
    this._module._free(this._pointerArrayPtr);
    this._channelData = null;
  }
} // class HeapAudioBuffer


/**
 * A JS FIFO implementation for the AudioWorklet. 3 assumptions for the
 * simpler operation:
 *  1. the push and the pull operation are done by 128 frames. (Web Audio
 *    API's render quantum size in the speficiation)
 *  2. the channel count of input/output cannot be changed dynamically.
 *    The AudioWorkletNode should be configured with the `.channelCount = k`
 *    (where k is the channel count you want) and
 *    `.channelCountMode = explicit`.
 *  3. This is for the single-thread operation. (obviously)
 *
 * @class
 */
class RingBuffer {
  /**
   * @constructor
   * @param  {number} length Buffer length in frames.
   * @param  {number} channelCount Buffer channel count.
   */
  constructor(length, channelCount) {
    this._readIndex = 0;
    this._writeIndex = 0;
    this._framesAvailable = 0;

    this._channelCount = channelCount;
    this._length = length;
    this._channelData = [];
    for (let i = 0; i < this._channelCount; ++i) {
      this._channelData[i] = new Float32Array(length);
    }
  }

  /**
   * Getter for Available frames in buffer.
   *
   * @return {number} Available frames in buffer.
   */
  get framesAvailable() {
    //console.log('hello', this._framesAvailable);
    return this._framesAvailable;
  }

  /**
   * Push a sequence of Float32Arrays to buffer.
   *
   * @param  {array} arraySequence A sequence of Float32Arrays.
   */
  push(arraySequence) {
    // The channel count of arraySequence and the length of each channel must
    // match with this buffer obejct.
    //console.log(arraySequence);
    // Transfer data from the |arraySequence| storage to the internal buffer.
    let sourceLength = arraySequence[0].length;
    for (let i = 0; i < sourceLength; ++i) {
      let writeIndex = (this._writeIndex + i) % this._length;
      for (let channel = 0; channel < this._channelCount; ++channel) {
        this._channelData[channel][writeIndex] = arraySequence[channel][i];
      }
    }

    this._writeIndex += sourceLength;
    if (this._writeIndex >= this._length) {
      this._writeIndex = 0;
    }

    // For excessive frames, the buffer will be overwritten.
    this._framesAvailable += sourceLength;
    if (this._framesAvailable > this._length) {
      this._framesAvailable = this._length;
    }
  }

  /**
   * Pull data out of buffer and fill a given sequence of Float32Arrays.
   *
   * @param  {array} arraySequence An array of Float32Arrays.
   */
  pull(arraySequence) {
    // The channel count of arraySequence and the length of each channel must
    // match with this buffer obejct.

    // If the FIFO is completely empty, do nothing.
    if (this._framesAvailable === 0) {
      return;
    }

    let destinationLength = arraySequence[0].length;

    // Transfer data from the internal buffer to the |arraySequence| storage.
    for (let i = 0; i < destinationLength; ++i) {
      let readIndex = (this._readIndex + i) % this._length;
      for (let channel = 0; channel < this._channelCount; ++channel) {
        arraySequence[channel][i] = this._channelData[channel][readIndex];
      }
    }

    this._readIndex += destinationLength;
    if (this._readIndex >= this._length) {
      this._readIndex = 0;
    }

    this._framesAvailable -= destinationLength;
    if (this._framesAvailable < 0) {
      this._framesAvailable = 0;
    }
  }
} // class RingBuffer

class channelRingBuffer {
  /**
   * @constructor
   * @param  {number} length Buffer length in frames.
   */
  constructor(length, channelCount) {
    this._readIndex = 0;
    this._writeIndex = 0;
    this._framesAvailable = 0;

    this._length = length;
    this._Data = new Float32Array(length);
  }

  /**
   * Getter for Available frames in buffer.
   *
   * @return {number} Available frames in buffer.
   */
  get framesAvailable() {
    //console.log('hello', this._framesAvailable);
    return this._framesAvailable;
  }

  /**
   * Push a sequence of Float32Arrays to buffer.
   *
   * @param  {array} arraySequence A sequence of Float32Arrays.
   */
  push(arraySequence) {
    // The channel count of arraySequence and the length of each channel must
    // match with this buffer obejct.
    //console.log(arraySequence);
    // Transfer data from the |arraySequence| storage to the internal buffer.
    let sourceLength = arraySequence.length;
    for (let i = 0; i < sourceLength; ++i) {
      let writeIndex = (this._writeIndex + i) % this._length;
        this._Data[writeIndex] = arraySequence[i];
    }

    this._writeIndex += sourceLength;
    if (this._writeIndex >= this._length) {
      this._writeIndex = 0;
    }

    // For excessive frames, the buffer will be overwritten.
    this._framesAvailable += sourceLength;
    if (this._framesAvailable > this._length) {
      this._framesAvailable = this._length;
    }
  }

  /**
   * Pull data out of buffer and fill a given sequence of Float32Arrays.
   *
   * @param  {array} arraySequence An array of Float32Arrays.
   */
  pull(arraySequence) {
    // The channel count of arraySequence and the length of each channel must
    // match with this buffer obejct.

    // If the FIFO is completely empty, do nothing.
    if (this._framesAvailable === 0) {
      return;
    }

    let destinationLength = arraySequence.length;
    //console.log('destination , lenght', arraySequence, destinationLength)
    // Transfer data from the internal buffer to the |arraySequence| storage.
    for (let i = 0; i < destinationLength; ++i) {
      let readIndex = (this._readIndex + i) % this._length;

//      console.log('wtf', arraySequence[i], i, this._channelData[readIndex], readIndex)
//        console.log('wtf', arraySequence[i], i, this._Data, readIndex)

      arraySequence[i] = this._Data[readIndex];

    }

    this._readIndex += destinationLength;
    if (this._readIndex >= this._length) {
      this._readIndex = 0;
    }

    this._framesAvailable -= destinationLength;
    if (this._framesAvailable < 0) {
      this._framesAvailable = 0;
    }
  }
} // class channelRingBuffer



export {
  MAX_CHANNEL_COUNT,
  RENDER_QUANTUM_FRAMES,
  HeapAudioBuffer,
  RingBuffer,
  channelRingBuffer,

};
