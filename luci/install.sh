#!/bin/sh

# Guide for getting simultanous wifi ap and station on Edison
# opkg install iw
# iw dev wlan0 interface add wlan0_ap  type __ap
# ip link set dev wlan0_ap  address 12:34:56:78:ab:ce (or whatever mac you want)
# vi /etc/hostapd/hostapd.conf -> change ssid to something unique (not same as edison name)
# and change interface to wlan0_ap
# hostapd -B /etc/hostapd/hostapd.conf

set -e

function finish {
  echo "!! Error occured. Please try again."
}

trap finish EXIT

echo "[------] Configuring Edison..."
configure_edison --setup

echo "[*-----] Configuring opkg..."
{
  rm /etc/opkg/base-feeds.conf
  touch /etc/opkg/base-feeds.conf
  echo "src/gz all http://repo.opkg.net/edison/repo/all" >> /etc/opkg/base-feeds.conf
  echo "src/gz edison http://repo.opkg.net/edison/repo/edison" >> /etc/opkg/base-feeds.conf
  echo "src/gz core2-32 http://repo.opkg.net/edison/repo/core2-32" >> /etc/opkg/base-feeds.conf
  opkg update
} &> /dev/null

echo "[**----] Installing dependencies..."
{
  opkg install python-pip
  opkg install git
  pip install "pySerial>=2.0,<=2.9999"
  pip install pymavlink
  pip install mavproxy
} &> /dev/null

echo "[***---] Upgrading Node... (Please wait, this may take up to 15 minutes depending on your internet speed)"
wget stage.dronesmith.io/cdn/DSS_Node_5_8_0.tar
{
  tar xvf DSS_Node_5_8_0.tar
  rm -rf DSS_Node_5_8_0.tar
  cd dssnode/
  ./install.sh
  cd ~
  rm -rf dssnode/
} &> /dev/null

echo "[****--] Installing Lucimon..."
git clone https://bitbucket.org/dronesmithdev/forge-core.git dss
{
  cd ~/dss/luci/monitor
  chmod +x run.sh
  npm install
  cp ~/dss/luci/common.xml ./node_modules/mavlink/src/mavlink/message_definitions/v1.0/common.xml
  cp ~/dss/luci/mavlinkv10.py /usr/lib/python2.7/site-packages/pymavlink/mavlinkv10.py
  #rm /usr/lib/python2.7/site-packages/pymavlink/mavlinkv10.pyc
  cp -r ~/dss/ /opt/dss/
  mkdir /etc/init.d
  cp ~/dss/luci/load.sh /etc/init.d/load.sh
  chmod +x /etc/init.d/load.sh
  cd /etc/init.d/
  update-rc.d load.sh defaults
} &> /dev/null

echo "[*****-] Flashing the FMU..."
echo "Please note that the FMU must be powered and may need to be rebooted."
cd ~/dss/luci
./flashfirm.sh

echo "[******] Done. Rebooting in 5..."
sleep 1
echo "4..."
sleep 1
echo "3..."
sleep 1
echo "2..."
sleep 1
echo "1..."
sleep 1
reboot
