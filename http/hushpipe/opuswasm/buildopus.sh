#!/usr/bin/env bash

set -eux 

source ../../../../emsdk/emsdk_env.sh

# non llvm backend
#emsdk activate latest-fastcomp

# llvm backend
../../../../emsdk/emsdk activate latest

#emsdk activate latest


cd opus
git status
if make clean
then
  echo "cleaned"
fi
./autogen.sh
#emconfigure ./configure --disable-rtcd --disable-intrinsics --disable-shared --enable-static --disable-stack-protector --disable-celt
# EMCC_OPTS=-O3 --memory-init-file 0 -s BUILD_AS_WORKER=1 -s NO_EXIT_RUNTIME=1 -s NO_FILESYSTEM=1 -s EXPORTED_FUNCTIONS="['_malloc']" -s EXPORTED_RUNTIME_METHODS="['setValue', 'getValue']"

emconfigure ./configure --disable-intrinsics --disable-rtcd --disable-shared --enable-static --disable-stack-protector CFLAGS='-O2'

emmake make -j$(nproc)

