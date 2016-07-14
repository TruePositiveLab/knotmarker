#!/bin/sh
set -e
source /build/buildconfig
set -x

apk add --no-cache  build-base \
    gettext \
    jpeg-dev \
    libwebp-dev \
    libxml2-dev \
    python3-dev \
    zlib-dev \
    git
# install python requirements
LIBRARY_PATH=/lib:/usr/lib \
pip3 install \
    --no-cache-dir \
    -r /build/requirements.txt
