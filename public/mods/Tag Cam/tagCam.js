(function() {
    'use strict';
	forgeApp
    .controller('TagCamCtrl', function($scope, $modal, $log) {
			$scope.startLaserTag = function() {
        var modalInstance = $modal.open({
          templateUrl: 'mods/Tag Cam/tagGame.html',
          controller: 'TagModalCtrl',
        });

        modalInstance.result.then(function (selectedItem) {
        }, function () {
          $log.info('Modal dismissed at: ' + new Date());
        });
      };
		})

    .controller('TagModalCtrl', function($scope, $modalInstance) {
      $scope.close = function () {
        $modalInstance.dismiss('cancel');
      };
    })
	;
})();
