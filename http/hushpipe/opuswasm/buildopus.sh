#!/usr/bin/env bash

set -eux 

source ../../../../emsdk/emsdk_env.sh

cd opus
git status
if make clean
then
  echo "cleaned"
fi
./autogen.sh
emconfigure ./configure --disable-rtcd --disable-intrinsics --disable-shared --enable-static --disable-stack-protector --disable-celt
emmake make -j$(nproc)

