#!/bin/sh

set -e

mavproxy.py --master=/dev/ttyMFD1 --baud=921600 --daemon --cmd="module unload rc; output add 0.0.0.0:14550; output add 0.0.0.0:14551;" &
sleep 5
cd /opt/dss/luci/monitor
node app.js &
