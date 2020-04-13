#!/usr/bin/env bash 
set -eux
source ../../../../emsdk/emsdk_env.sh
#emsdk activate latest
emsdk activate latest-fastcomp
#emcc --bind -O1 \
#	  -s WASM=1 \
#		-s BINARYEN_ASYNC_COMPILATION=0 \
#		-s SINGLE_FILE=1 \
#		VariableBufferKernel.cc \
#		-o variable-buffer-kernel.wasmmodule.js \

#emcc --bind -O1 \
#	  -s WASM=1 \
#		-s BINARYEN_ASYNC_COMPILATION=0 \
#		-s SINGLE_FILE=1 \
#    -Iopus/include -Lopus/.libs -lopus \
#		OpusKernel.cc \
#		-o opuskernel.wasm.js \

		#-s SINGLE_FILE=1 \

    #-s ASSERTIONS=1 \
    
		#-s BINARYEN_ASYNC_COMPILATION=0 \
# WASM_ASYNC_COMPILATION = 1;
# WASM_ASYNC_COMPILATION = 1;

    #-s STANDALONE_WASM=1 \ << need llvm for that
    # https://v8.dev/blog/emscripten-standalone-wasm

#https://github.com/emscripten-core/emscripten/blob/master/src/settings.js


emcc --bind -O0 \
	  -s WASM=1 \
    -s MINIMAL_RUNTIME=0 \
    -s MINIMAL_RUNTIME_STREAMING_WASM_COMPILATION=1 \
    -s MINIFY_HTML=1 \
    -s ASSERTIONS=1 \
    -s "EXTRA_EXPORTED_RUNTIME_METHODS=['UTF32ToString']" \
    -Iopus/include -Lopus/.libs -lopus \
		VariableBufferKernel.cc \
		-o variablebuffer.js.html

emcc --bind -O0 \
	  -s WASM=1 \
    -s MINIMAL_RUNTIME=0 \
    -s MINIMAL_RUNTIME_STREAMING_WASM_COMPILATION=1 \
    -s MINIFY_HTML=1 \
    -Iopus/include -Lopus/.libs -lopus \
		Opus.cc \
    -s "EXPORTED_FUNCTIONS=['_opus_encoder_create']" \
		-o opus.wasm.js.html



#When using the WebIDL binder, often what you are doing is creating a library. In that case, the MODULARIZE option makes sense to use. It wraps the entire JavaScript output in a function, which you call to create instances,
#(You can use the EXPORT_NAME option to change Module to something else.) This is good practice for libraries, as then they don’t include unnecessary things in the global scope (and in some cases you want to create more than one).

# var instance = Module();
#var b = new Module.Bar(123);
#b.doSomething();
