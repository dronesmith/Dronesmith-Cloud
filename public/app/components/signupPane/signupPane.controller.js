'use strict';

angular
  .module('ForgeApp')
  .controller('signupPaneCtrl', function ($scope, Session, User, Error) {

    $scope.signupSubmitted = false;

    $scope.update = function(user) {
      var user = new User($scope.signUpInfo);
        user
          .$save()
          .then(function(data) {
            $scope.signupSubmitted = true;
          }, Error)
        ;
    };
  })
;
