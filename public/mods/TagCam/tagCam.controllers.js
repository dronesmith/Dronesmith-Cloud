(function() {
    'use strict';
	forgeApp.controller('tagCamCtrl', ['$scope', '$mdDialog', function($scope, $mdDialog){
			$scope.submit = function(event){
                $mdDialog.show({
                    controller: DialogController,
                    templateUrl: "mods/tagCam/tagGame.html",
                    parent: angular.element(document.body),
                    targetEvent: event
                });
            };
		}])
	;

    function DialogController($scope, $mdDialog){
        $scope.close = function(){
            $mdDialog.hide();
        };
    }
})();