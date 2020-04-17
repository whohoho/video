#!/usr/bin/env bash

chromium --temp-profile --use-fake-device-for-media-stream https://localhost/hushpipe/opuswasm

#chromium --temp-profile --use-fake-device-for-media-stream --use-file-for-fake-video-capture=testfile.y4m http://localhost:80

