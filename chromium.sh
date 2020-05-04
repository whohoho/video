#!/usr/bin/env bash
# https://peter.sh/experiments/chromium-command-line-switches/

chromium --temp-profile --use-fake-device-for-media-stream --auto-open-devtools-for-tabs  'https://localhost/hushpipe/#FbohpXgkmDjKUkHO8EtJ6rP3aYTeBY1tlg4@zLmMHvw_'

#chromium --temp-profile --use-fake-device-for-media-stream --use-file-for-fake-video-capture=testfile.y4m http://localhost:80

