# hushpipe (encrypted video chatroom)

### setting up a dev environment
to get a janus + nginx serving the html:

````
docker-compose -f docker-compose-local.yml up (or setup a janus with the janus-sfu module yourself)
````

install emscripten sdk: 

````
cd ../
git clone https://github.com/emscripten-core/emsdk.git
./emsdk update-tags
./emsdk install latest

# only if latest does not work: #./emsdk install latest-fastcomp
````

build opus wasm: 
````
cd http/hushpipe/opuswasm
git submodule init
git submodule update
./buildopus.sh
./build.sh
````

start some chromium's:
````
chromium --temp-profile --use-fake-device-for-media-stream http://localhost:80/hushpipe/

chromium --temp-profile --use-fake-device-for-media-stream --use-file-for-fake-video-capture=/home/user/javascript/hushtalk/foreman.y4m http://localhost:80/hushpipe/
````



Roadmap:

Soon:
* webm demuxer (for tuning in mid stream / dealing with packet loss)
* audiocontext / wasm opus encoder , for low latency audio feeds
* chatbox
* key rotation

Later:
* generate some kind of picture / color from key id
* persistent identities (in same room)
* presentation mode (a/v in sync)
* usable user interface
* high latency a/v (sending clips)
* put messages in some translation file
* relay selection (with rtt indication)





All rights reserved, 
Please post an issue to get a licence quote

The hushpipe authors
