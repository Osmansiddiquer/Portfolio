#!/bin/bash
# Compile the web-ported Pong to WebAssembly with Emscripten.
set -e
cd "$(dirname "$0")"

emcc \
  main.c utility.c Physics.c Draw.c Scenes.c web_compat.c \
  -I. \
  -O2 \
  -std=gnu11 \
  -sASYNCIFY \
  -sASYNCIFY_STACK_SIZE=32768 \
  -sSTACK_SIZE=5MB \
  -sALLOW_MEMORY_GROWTH=1 \
  -sFORCE_FILESYSTEM=1 \
  -sMODULARIZE=1 \
  -sEXPORT_NAME=PongModule \
  -sENVIRONMENT=web \
  -sEXIT_RUNTIME=0 \
  -sEXPORTED_FUNCTIONS=_main,_web_set_key,_web_clear_keys,_malloc,_free \
  -sEXPORTED_RUNTIME_METHODS=ccall,cwrap,stringToUTF8,UTF8ToString,FS,callMain \
  -o pong.js

echo "BUILD_OK"
ls -la pong.js pong.wasm
