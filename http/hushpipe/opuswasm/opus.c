#include <emscripten.h>
#include "opus_defines.h"
#include "opus.h"

#define MAX_PACKET (1500)
#define FRAME (480)
#define CHANNELS (1)


EMSCRIPTEN_KEEPALIVE
int version() {
  return 12345;
}

// javascript is supposed to allocate the memory, this tells it the size needed
// probably there is no need to call this, and can be hardcoded
EMSCRIPTEN_KEEPALIVE int getEncoderSize () {
  return opus_encoder_get_size(CHANNELS);
}

EMSCRIPTEN_KEEPALIVE int getDecoderSize () {
  return opus_decoder_get_size(CHANNELS);
}

EMSCRIPTEN_KEEPALIVE
//  sizeof *enc = opus_encoder_get_size(channels);
int initEnc(unsigned char *enc) {
    
   #ifdef CUSTOM
    OpusCustomMode *opus_mode = opus_custom_mode_create(48000, FRAME, NULL);
    OpusCustomEncoder *oe = opus_custom_encoder_create( opus_mode, 1, &err );
    //opus_custom_encoder_ctl(oe, OPUS_SET_BITRATE(kbps*1024)); // bits per second
    //opus_custom_encoder_ctl(oe, OPUS_SET_COMPLEXITY(10));
    //opus_custom_encoder_ctl(oe, OPUS_SET_SIGNAL(OPUS_SIGNAL_MUSIC));
    opus_custom_encoder_ctl(oe, OPUS_SET_SIGNAL(OPUS_APPLICATION_VOIP));
    return oe; 
  #else
    int ret;
    // using init instead of create, cause then we pass it the memory
    ret = opus_encoder_init(enc, 48000, CHANNELS, OPUS_APPLICATION_VOIP);

    //opus_encoder_ctl(enc, OPUS_SET_BITRATE(bitrate_bps));
    //opus_encoder_ctl(enc, OPUS_SET_BANDWIDTH(bandwidth));
    opus_encoder_ctl(enc, OPUS_SET_VBR(0));
    //opus_encoder_ctl(enc, OPUS_SET_VBR_CONSTRAINT(cvbr));
    //opus_encoder_ctl(enc, OPUS_SET_COMPLEXITY(complexity));
    opus_encoder_ctl(enc, OPUS_SET_INBAND_FEC(1));
    //opus_encoder_ctl(enc, OPUS_SET_FORCE_CHANNELS(forcechannels));
    //opus_encoder_ctl(enc, OPUS_SET_DTX(use_dtx));
    opus_encoder_ctl(enc, OPUS_SET_PACKET_LOSS_PERC(30));

    //opus_encoder_ctl(enc, OPUS_GET_LOOKAHEAD(&skip));
    //opus_encoder_ctl(enc, OPUS_SET_LSB_DEPTH(16));
    //opus_encoder_ctl(enc, OPUS_SET_EXPERT_FRAME_DURATION(variable_duration));
    return ret;
  #endif
}

EMSCRIPTEN_KEEPALIVE
//  sizeof *enc = opus_decoder_get_size(channels);
int initDec(unsigned char *enc) {
    // using init instead of create, cause then we pass it the memory
    return opus_decoder_init(enc, 48000, CHANNELS);
}



// packet is char[] of MAX_PACKET size
// enc is the encoder state
// input_buffer is the float32 audio  (has to be a valid size) frame_size*channels*sizeof(float)
EMSCRIPTEN_KEEPALIVE
int encode(struct OpusEncoder *enc, float *input_buffer, unsigned char *packet) {
  /*
  * <li>audio_frame is the audio data in opus_int16 (or float for opus_encode_float())</li>
  * <li>frame_size is the duration of the frame in samples (per channel)</li>
  * <li>packet is the byte array to which the compressed data is written</li>
  * <li>max_packet is the maximum number of bytes that can be written in the packet (4000 bytes is recommended).
  *     Do not use max_packet to control VBR target bitrate, instead use the #OPUS_SET_BITRATE CTL.</li>
  * </ul>
  *
  * opus_encode() and opus_encode_float() return the number of bytes actually written to the packet.
  * The return value <b>can be negative</b>, which indicates that an error has occurred. If the return value
  * is 2 bytes or less, then the packet does not need to be transmitted (DTX).
  */
    // 257 is from opus tests, probably header?
    // kernel_buffer_size has to be a valid opus input size
    // frame size = 480 == 10ms at 48khz
  int len;
  len = opus_encode_float(enc, input_buffer, FRAME, packet, MAX_PACKET);

  opus_packet_pad(packet, len, MAX_PACKET);
  return len;

  //The length of the encoded packet (in bytes) on success or a
  // *          negative error code (see @ref opus_errorcodes) on failure.

}

// Lost packets can be replaced with loss concealment by calling
//  * the decoder with a null pointer and zero length for the missing packet.
EMSCRIPTEN_KEEPALIVE
int decode(struct OpusDecoder  *dec, const unsigned char *input_packet, int len , float *output_buffer){

  // returns frame size or err
  return opus_decode_float(dec, input_packet, len, output_buffer, FRAME, 0);


}



/*  * @arg bitrate is in bits per second (b/s)
  * @arg complexity is a value from 1 to 10, where 1 is the lowest complexity and 10 is the highest
  * @arg signal_type is either OPUS_AUTO (default), OPUS_SIGNAL_VOICE, or OPUS_SIGNAL_MUSIC

 *   * opus_encoder_ctl(enc, OPUS_SET_BITRATE(bitrate));
  * opus_encoder_ctl(enc, OPUS_SET_COMPLEXITY(complexity));
  * opus_encoder_ctl(enc, OPUS_SET_SIGNAL(signal_type));
*/




