(function() {
    'use strict';
	forgeApp.controller('TagCamCtrl', ['$scope', function($scope){
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

    function DialogController($scope){
        $scope.close = function(){
        };
    }
})();
