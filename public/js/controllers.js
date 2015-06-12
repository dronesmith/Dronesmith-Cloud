(function() {
  'use strict';

  angular
    .module('Forge.controllers', [])

    // View Controllers

    .controller('ErrorCtrl', function($scope, $rootScope) {
      $scope.error = $rootScope.ServerError
        || "The server didn't send back anything.";
    })

    .controller('AppCtrl', function($scope, $rootScope) {
      $scope.alerts = [];

      $scope.$on('alert:fail', function(ev, data) {
        $scope.addAlert(data.error || data);
      })

      $scope.closeAlert = function(index) {
        $scope.alerts.splice(index, 1);
      };

      $scope.addAlert = function(msg, kind) {
        $scope.alerts.push(
          {type: kind || 'danger', msg: msg || 'bad request'});
      };


    })

    .controller('ForgeCtrl', function($scope, $log, $state, Session) {
      $scope.userInfo = null;

      Session
        .get({}, function(data) {
          $scope.userInfo = data.userData || null;
          if (!$scope.userInfo) {
            $state.go('login');
          } else {
            $scope.$broadcast('session:update', $scope.userInfo);
          }
        });
    })

    .controller('LoginCtrl', function($scope, $log, $state, Session) {

      $scope.login = function() {
        // TODO probably some kind of auth service that rests on top of session resource.
        Session
          .authenticate($scope.loginInfo)
          .$promise
          .then(function(data) {
            $state.go('forge');
          })
        ;
      }
    })

    .controller('SignUpCtrl', function($scope, $log, $state, $timeout, Users, Session) {

      $scope.signup = function() {
        var user = new Users($scope.signUpInfo);
        user
          .$save()
          .then(function(data) {
            Session
              .authenticate($scope.signUpInfo)
              .$promise
              .then(function(data) {

                $state.go('forge');

              })
            ;
          })
        ;
      };

    })

    // Directive Controllers

    .controller('CommunityBarCtrl', function($scope, $state, Session) {
      // FIXME We don't want to poll when we can just retrieve this from the
      // parent controller.
      // Or, maybe make a Forge Service?
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

    .controller('ModViewCtrl', function($scope, Session) {
      $scope.mods = [];

      $scope.activeMod = null;

      $scope.$on('session:update', function(ev, sessionData) {
        $scope.mods = sessionData.mods;

        if (!$scope.activeMod && $scope.mods.length > 0) {
          $scope.activeMod = $scope.mods[0];
        }
      });
    })

    .controller('EeduLinkCtrl', function($scope) {

    })
  ;
})();
