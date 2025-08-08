#!/usr/bin/env bash

# Create a virtual display for OpenCV to use
Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &
export DISPLAY=:99

# Run the Flask app with Gunicorn
gunicorn --bind 0.0.0.0:5000 app:app
