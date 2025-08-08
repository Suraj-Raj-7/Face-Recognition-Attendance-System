#!/usr/bin/env bash

# Install the dependencies from requirements.txt
pip install -r requirements.txt

# The build process for face-recognition is memory intensive, so we install it separately
pip install face-recognition --no-cache-dir

# The build process for dlib is also memory intensive, so we install it separately
pip install dlib --no-cache-dir

# The `build.sh` script should not exit, but should return a success status
exit 0
