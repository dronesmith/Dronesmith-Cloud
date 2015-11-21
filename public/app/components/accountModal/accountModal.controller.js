'use strict';

angular
  .module('ForgeApp')
  .controller('AccountModalCtrl',
    function (
      $scope,
      $uibModalInstance,
      Session,
      User,
      Error,
      userAccount) {

        // always poll session since it may have been updated.
        Session.get({}, function(data) {
          $scope.userAccount = data.userData;
        }, Error);

        $scope.status = "";

        $scope.ok = function() {
          $scope.status = "";
          // Send PUT request
          if (!$scope.userAccount.password) {
            $scope.status = "Your current password is required.";
            return;
          }

          if ($scope.userAccount.newPassword || $scope.userAccount.confirmPassword) {
            if ($scope.userAccount.newPassword !== $scope.userAccount.confirmPassword) {
              $scope.status = "New password fields must match!";
              return;
            }
          }

          User
            .update($scope.userAccount)
            .$promise
            .then(function(data) {
              // Need to remove the tender fields due to caching.
              $scope.userAccount.password = null;
              $scope.userAccount.newPassword = null;
              $scope.userAccount.confirmPassword = null;
              $uibModalInstance.close();
            }, Error)
          ;
    };

    $scope.cancel = function() {
      $uibModalInstance.dismiss('cancel');
    };
  })
;
