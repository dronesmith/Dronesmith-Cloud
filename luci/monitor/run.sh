#!/bin/sh

set -e

ping -c 5 8.8.8.8>>/dev/null

if [ $? -eq  0 ]
  then
  echo "Able to reach internet"
  configure_edison --disableOneTimeSetup
else
  echo "Unable to reach internet"
  configure_edison --enableOneTimeSetup
fi

mavproxy.py --master=/dev/ttyMFD1 --baud=921600 --daemon --cmd="module unload rc; output add 0.0.0.0:14550; output add 0.0.0.0:14551;" &
sleep 5
cd /opt/dss/luci/monitor
node app.js &
