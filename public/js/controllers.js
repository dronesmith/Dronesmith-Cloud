(function() {
  'use strict';

  angular
    .module('Forge.controllers', [])

    // View Controllers

    .controller('ErrorCtrl', function($scope, $rootScope) {
      $scope.error = $rootScope.ServerError
        || "The server didn't send back anything.";
    })

    .controller('ForgeCtrl', function($scope, $log, $state, Session) {
      $scope.userInfo = null;

      Session
        .get({}, function(data) {
          $scope.userInfo = data.userData || null;
          if (!$scope.userInfo) {
            $state.go('login');
          }
        });
    })

    .controller('LoginCtrl', function($scope, $log, $state, Session) {
      $scope.login = function() {
        Session
          .authenticate($scope.loginInfo)
          .$promise
          .then(function(data) {
            if (data) {
              $state.go('forge');
            }
          });

      }
    })

    .controller('SignUpCtrl', function($scope, $log, Users) {
      $scope.signup = function() {
        // TODO POST account to User
        var user = new Users({
          username: 'Hurp2',
          password: 'durple500',
          confirmPassword: 'durple500',
          email: 'hurp@durp.com'
        })
          .$save();

        // TODO
        // Session.authenticate({});
      };

    })

    // Directive Controllers

    .controller('CommunityBarCtrl', function($scope, $state, Session) {
      $scope.userInfo = null;
      Session
        .get({}, function(data) {
          $scope.userInfo = data.userData || null;
        });

      $scope.logout = function() {
        Session
          .authenticate({deauth: true})
          .$promise
          .then(function(data) {
            if (!data.userData) {
              $state.go('login');
            }
          });
      };
    })

    .controller('ModViewCtrl', function($scope) {

    })

    .controller('EeduLinkCtrl', function($scope) {

    })
  ;
})();
