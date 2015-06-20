(function(){
	'use strict';

	forgeApp
		.controller('HangarCtrl', ['$scope', '$modal', function($scope, $modal) {

			$scope.configMotors = function() {
				var modalInstance = $modal.open({
					templateUrl: 'mods/Hangar/calibModal.html',
					controller: 'CalibModalCtrl'
				});

				modalInstance.result.then(function (selectedItem) {
				}, function () {
					$log.info('Modal dismissed at: ' + new Date());
				});
			};

			$scope.sidePanelSelect = 'inventory';

			$scope.CONTROLLER_VALS = [
				'Throttle', 'Yaw', 'Roll', 'Pitch', 'AUX1', 'AUX2', 'AUX3'
			];

			// TODO load this info from DB.
			$scope.eeduSelect = [
				{
					_id: 'dsfgfsdjgfdsjgklfds',
					name: 'eedu1',
					type: 'UAV',
					img: 'mods/Hangar/eedu.png',
					meta:
						{
							'Maker': 'Skyworks Aerial Systems',
							'Serial': '9384903943534SYD283',
							'Firmware': '1.3.4',
							'Last Usage': new Date()
						},
					config: {
						status: 'Unknown',
						calibration: {
							esc: false,
							imu: false,
							pid: {
								P: 1.0325,
								I: 0.9367,
								D: 1.0351
							}
						}
					}
				}
			];
			$scope.selectedEedu = $scope.eeduSelect[0];

			// TODO load this info from DB.
			$scope.controllerSelect = [
				{
					_id: 'kdsgljfklgjlksfdjgkl',
					name: 'DSM Spektrum',
					type: 'Controller',
					img: '',
					meta:
						{
							'Maker': 'DSM',
							'Connectivity': 'Command & Control Radio',
							'Last Usage': new Date()
						},
					config: {
						keymap: [
							'Thumb1X', 'Thumb1Y', 'Thumb2X', 'Thumb2Y',
							'Aux1', 'Aux2', 'Aux3', 'Aux4'],
							keybinding: {}
						}

				},

				{
					_id: 'dgjdksgjfdskgjdafhjkdfjkh',
					name: 'Playstation Gamepad',
					img: '',
					type: 'Controller',
					meta:
						{
							'Maker': 'Sony Computer Entertainment',
							'Connectivity': 'Bluetooth Radio',
							'Last Usage': new Date()
						},
					config: {
						pairedEedus: [],
						// FIXME note, for some reason, the UI fails to show this array
						// if it goes beyond a certain size. Ah, web development, where the
						// developer has to spend 30 minutes to otherwise what should be a 3
						// second problem because apparently displaying errors is a big no-no.
						// #retarded
						keymap: [
							'Square', 'Triangle', 'Circle', 'Cross'],
						keybinding: {}
					}
				}
			];
			$scope.selectedController = $scope.controllerSelect[0];

			// TODO load this info from DB.
			$scope.sensorSelect = [
				{
					_id: 'fdgjfidsgsfjlk',
					name: 'GROVEBarometer',
					img: 'mods/Hangar/baro.jpg',
					type: 'Sensor',
					meta:
						{
							'Maker': 'SEEED Studios',
							'Interface': 'I2C',
							'Last Usage': new Date()
						},
					config: {
						pairedEedus: []
					}

				}
			];
			$scope.selectedSensor = $scope.sensorSelect[0];


			$scope.selectedDevice = $scope.selectedEedu;


			$scope.changeDev = function(dev) {
				$scope.selectedDevice = angular.copy(dev);
			}
		}])

		.controller('CalibModalCtrl', function($scope, $modalInstance) {
			$scope.close = function () {
				$modalInstance.dismiss('cancel');
			};
		})

		;
})();
