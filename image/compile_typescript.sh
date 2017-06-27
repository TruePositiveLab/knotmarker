#!/bin/sh
set -e
source /build/buildconfig
set -x

apk add --no-cache nodejs nodejs-npm

npm config set registry http://registry.npmjs.org/
cd /app/knotmarker/static/js/external
npm install
npm install -g typescript typings
cd /app/knotmarker
tsc || true

apk del nodejs nodejs-npm
