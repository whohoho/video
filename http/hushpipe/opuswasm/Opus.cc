//https://emscripten.org/docs/porting/connecting_cpp_and_javascript/WebIDL-Binder.html#compiling-the-project-using-the-bindings-glue-code
// directly using the emscripten generated file as audioworklet: https://github.com/emscripten-core/emscripten/issues/6230
#include "emscripten/bind.h"
#include "opus.h"

#define MAX_PACKET (1500)
#define SAMPLES (48000*30)
#define SSAMPLES (SAMPLES/3)
#define MAX_FRAME_SAMP (5760)
#define PI (3.141592653589793238462643f)
#define RAND_SAMPLE(a) (a[fast_rand() % sizeof(a)/sizeof(a[0])])


using namespace emscripten;

class Opus {
 public:
  Opus(unsigned kernel_buffer_size)
      : kernel_buffer_size_(kernel_buffer_size),
        bytes_per_channel_(kernel_buffer_size * sizeof(float)) {}
  
  void initEnc() {
    enc = opus_encoder_create(48000, 1, OPUS_APPLICATION_VOIP, &err);
  }

  void Process(uintptr_t input_ptr, uintptr_t output_ptr,
               unsigned channel_count) {
    float* input_buffer = reinterpret_cast<float*>(input_ptr);
    float* output_buffer = reinterpret_cast<float*>(output_ptr);


    // stereo not supported
    if (channel_count != 1){
      // Bypasses the data. If the input channel is smaller than the output
      // channel, it fills the output channel with zero.
      for (unsigned channel = 0; channel < channel_count; ++channel) {
        float* destination = output_buffer + channel * kernel_buffer_size_;
        if (channel < channel_count) {
          float* source = input_buffer + channel * kernel_buffer_size_;
          memcpy(destination, source, bytes_per_channel_);
        } else {
          memset(destination, 0, bytes_per_channel_);
        }
      }
    }

    // only 1 channel supported
    int len; 
    // 257 is from opus tests, probably header?
    unsigned char packet[MAX_PACKET+257];
    // kernel_buffer_size has to be a valid opus input size
    len = opus_encode_float(enc, input_buffer, kernel_buffer_size_, packet, MAX_PACKET);
    if(len<0 || len>MAX_PACKET) {
       fprintf(stderr,"opus_encode() returned %d\n",len);
    }

    // just play silence for now
    memset(output_buffer, 0, bytes_per_channel_);


  }

 private:
  unsigned kernel_buffer_size_ = 0;
  unsigned bytes_per_channel_ = 0;
  int err;
  OpusEncoder  *enc;


};

float lerp(float a, float b, float t) {
    return (1 - t) * a + t * b;
}

EMSCRIPTEN_BINDINGS(my_module) {
    function("lerp", &lerp);
}


EMSCRIPTEN_BINDINGS(opus) {
  class_<Opus>("Opus")

      .constructor<unsigned>()
      .function("process", &Opus::Process, allow_raw_pointers() )
      .function("initenc", &Opus::initEnc);

}

