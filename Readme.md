# hushpipe (encrypted video chatroom)

### setting up a dev environment
to get a janus + nginx serving the html:

````
docker-compose -f docker-compose-local.yml up (or setup a janus with the janus-sfu module yourself)
````

start some chromium's:
````
chromium --temp-profile --use-fake-device-for-media-stream http://localhost:80/hushpipe/

chromium --temp-profile --use-fake-device-for-media-stream --use-file-for-fake-video-capture=/home/user/javascript/hushtalk/foreman.y4m http://localhost:80/hushpipe/
````


All rights reserved, 
Please post an issue to get a licence quote

The hushpipe authors
