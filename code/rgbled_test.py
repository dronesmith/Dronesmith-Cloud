# import sys
#
from lucikit import *
from pymavlink import *
import random

# import time
#
#
# # Connect to the Vehicle
vehicle = connect('0.0.0.0:14550', baud=57600, wait_ready=True)
#
print "Sending RGB Command"

vehicle._rgbled.color((1.0, 0.0, 1.0))
while True:
    vehicle._rgbled.color((random.random(), random.random(), random.random()))
    time.sleep(1)
    vehicle._rgbled.on()
    time.sleep(1)
    vehicle._rgbled.off()

# while not vehicle.is_armable:
#     time.sleep(1)
#
#
# def arm_and_takeoff(aTargetAltitude):
#     """
#     Arms vehicle and fly to aTargetAltitude.
#     """
#
#     print "Basic pre-arm checks"
#     # Don't try to arm until autopilot is ready
#     while not vehicle.is_armable:
#         print " Waiting for vehicle to initialise..."
#         time.sleep(1)
#
#
#     print "Arming motors"
#     # Copter should arm in GUIDED mode
#     vehicle.mode    = VehicleMode("GUIDED")
#     vehicle.armed   = True
#
#     # Confirm vehicle armed before attempting to take off
#     while not vehicle.armed:
#         print " Waiting for arming..."
#         vehicle.mode    = VehicleMode("GUIDED")
#         vehicle.armed   = True
#         time.sleep(1)
#
#     print "Taking off!"
#     vehicle.simple_takeoff(aTargetAltitude) # Take off to target altitude
#
# arm_and_takeoff(10)
# time.sleep(5)
#
# print "Set default/target airspeed to 3"
# sys.stdout.flush()
# vehicle.airspeed=3
# time.sleep(10)
#
# print "Returning to Launch"
# sys.stdout.flush()
# vehicle.mode    = VehicleMode("RTL")
# time.sleep(5)
#
#
# msg = vehicle.message_factory.command_long_encode(
#     1, 1,    # target_system, target_component
#     4000, #command
#     0, #confirmation
#     4,  # 0 - rgb color, 1 - predefined color, 2 - mode, 3 - pattern
#     0.0,          # red
#     0.0,          # green
#     0.0,          # blue
#     0, 0, 0)    # param 5 ~ 7 not used
# # send command to vehicle
# vehicle.send_mavlink(msg)

#Close vehicle object before exiting script
print "Close vehicle object"
sys.stdout.flush()
vehicle.close()
