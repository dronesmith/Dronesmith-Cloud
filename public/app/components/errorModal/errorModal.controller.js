'use strict';

angular
  .module('ForgeApp')
  .controller('ErrorModalCtrl', function ($scope, $uibModalInstance, error) {
    $scope.error = error;

    $scope.cancel = function () {
      $uibModalInstance.dismiss('cancel');
    };
  })
;
