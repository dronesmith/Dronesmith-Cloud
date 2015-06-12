(function(){
	'use strict';

	forgeApp
		.controller('HangarCtrl', ['$scope', '$mdDialog', function($scope, $mdDialog){

			$scope.hangar = {
				title: "Hangar",
				subMenus: []
			}

			$scope.logs = [
				{'log': 'Fifth Flight', 'time': '5/5/15'},
				{'log': 'Fourth Flight', 'time': '4/5/15'},
				{'log': 'Thrid Flight', 'time': '3/5/15'},
				{'log': 'Second Flight', 'time': '2/5/15'},
				{'log': 'First Flight', 'time': '1/5/15'}
				];

			$scope.devices = [
				{"name": "eedu One"},
				{"name": "eedu Two"},
				{"name": "eedu Three"},
				{"name": "eedu Four"}
				]
			$scope.defaultDevice = $scope.devices[0];

            $scope.connectToEedu = function(event){
                var deviceName = $scope.device.name;

                $mdDialog.show(
                    $mdDialog.alert()
                        .parent(angular.element(document.body))
                        .title('Connection')
                        .content(deviceName + ' is connected')
                        .ok("Ok")
                        .targetEvent(event)
                )
            };
		}])

		;
})();
