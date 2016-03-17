#!/bin/sh

set -e

mavproxy.py --master=/dev/ttyMFD1 --baud=921600 --daemon --out="module unload rc; output 0.0.0.0:14550; utput 0.0.0.0:14551;" &
sleep 5
node /opt/dss/luci/monitor app.js &
