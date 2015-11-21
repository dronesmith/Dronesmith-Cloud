'use strict';

angular
  .module('ForgeApp')
  .controller('resetPasswordPaneCtrl', function ($scope, Session, User, Error) {

    $scope.passwordSubmitted = false;

    $scope.update = function(user) {
      User
        .forgotPassword(user)
        .$promise
        .then(function(data) {
          $scope.passwordSubmitted = true;
        }, Error)
      ;
    };
  })
;
