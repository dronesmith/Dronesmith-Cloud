# Luci Monitor

The default node and python instances on the Edison will work. 

**install.sh** - Installs the node dependencies and some python middleware,  which are used to act as a communications node between the Edison and the coprocessor.

**run.sh** - Runs all the necessary components as background processes.

**test.sh** - Runs a simulated flight, showing an example of what the output from the coprocessor may look like.

Python's package manager pip is required for the python dependencies. I followed [this guide](http://mendrugory.weebly.com/blog/intel-edison-and-python), which adds a custom repo to Yocto's opkg package manager, allowing you to get pip on the Edison. If you get [this error](http://stackoverflow.com/questions/34602168/dronekit-failed-to-connect-to-dev-tty-usbmodem1411-serial-object-has-no-at) use the first answer to fix: `pip install "pySerial>=2.0,<=2.9999"`. That dependency issue should be resolved soon.
