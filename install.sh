#! /bin/bash

set -e

git submodule update --init --recursive
git submodule foreach --recursive git submodule update --init
npm install
cd forge-ux/
bower install
cd ..
mkdir log

