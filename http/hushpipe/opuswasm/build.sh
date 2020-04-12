#!/usr/bin/env bash 
set -eux
source ../../../../emsdk/emsdk_env.sh

emcc --bind -O1 \
	  -s WASM=1 \
		-s BINARYEN_ASYNC_COMPILATION=0 \
		-s SINGLE_FILE=1 \
		VariableBufferKernel.cc \
		-o variable-buffer-kernel.wasmmodule.js \

emcc --bind -O1 \
	  -s WASM=1 \
		-s BINARYEN_ASYNC_COMPILATION=0 \
		-s SINGLE_FILE=1 \
    -Iopus/include -Lopus/.libs -lopus \
		OpusKernel.cc \
		-o opuskernel.wasm.js \

