(function(){
	'use strict';

	forgeApp
		.controller('PilotCtrl', ['$scope', '$interval', function($scope, $interval) {

			$interval(function() {
				for (var obj in $scope.planner.widgets[1].info) {
					var val = $scope.planner.widgets[1].info[obj].value;
					val = (Math.random() * val/4) + $scope.planner.widgets[1].info[obj].base;
					$scope.planner.widgets[1].info[obj].value = angular.copy(val.toFixed? val.toFixed() : 0);
				}
			}, 1000);

      $scope.planner = {
        title: "Flight Planner",
        subMenus: [
          {name: "Waypoints"},
          {name: "Pilot Mode"},
          {name: "Flight Data"}
        ],

        widgets: [
          {
            id: "OSD"
            // TODO three js here? Need something flashy.
          },

          {
            id: "downlink",
            info: {
              speed: {
                name: "Air Speed",
                value: 47,
								base: 47,
                unit: "m/s",
                style: {
                  'color': '#FF0066',
                  'font-size': '50px'
                }
              },
              altitude: {
                name: "Altitude",
                value: 51,
								base: 51,
                unit: "ft",
                style: {
                  'color': '#FF8300',
                  'font-size': '50px'
                }
              },
              wayPointComplete: {
                name: "Waypoints Completed",
                value: 3,
								base: 3,
                style: {
                  'color': '#0000FF',
                  'font-size': '50px'
                }
              },
              wayPointTotal: {
                name: "Total Waypoints",
                value: 7,
								base: 7,
                style: {
                  'color': '#FFFF00',
                  'font-size': '50px'
                }
              },
              missionCompletion: {
                name: "Mission Completion",
                value: 23,
								base: 23,
                unit: "%",
                style: {
                  'color': '#00FFFF',
                  'font-size': '50px'
                }
              },
              battery: {
                name: "Battery Remaining",
                value: 89,
								base: 89,
                unit: "%",
                style: {
                  'color': '#00FF99',
                  'font-size': '50px'
                }
              },
              activeSensors: {
                name: "Active Sensors",
                value: 2,
								base: 2,
                style: {
                  'color': '#FF0009',
                  'font-size': '50px'
                }
              },
              flightTimeRemain: {
                name: "Flight Time Remaining",
                value: 14*60,
								base: 14*60,
                unit: "s",
                style: {
                  'color': '#FF8300',
                  'font-size': '50px'
                }
              },
              distanceFlown: {
                name: "Distance Flown",
                value: 654,
								base: 654,
                unit: "ft",
                style: {
                  'color': '#5660FF',
                  'font-size': '50px'
                }
              },
              flightTimeElapsed: {
                name: "Flight Time",
                value: 6*60,
								base: 6*60,
                unit: "s",
                style: {
                  'color': '#99FF00',
                  'font-size': '50px'
                }
              }
            }
          }
        ]
      };

		}]);
})();
