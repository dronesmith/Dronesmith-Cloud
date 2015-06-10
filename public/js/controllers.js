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
      // TODO maybe make this into a directive for 400s?
      $scope.alerts = [
      ];


      $scope.login = function() {
        // TODO probably some kind of auth service that rests on top of session resource.
        Session
          .authenticate($scope.loginInfo)
          .$promise
          .then(function(data) {
            if (data) {
              $state.go('forge');
            }
          })
          .catch(function(rejection) {
            $scope.error = $scope.alerts.push(
              {type: 'danger', msg: rejection.data.error});
          })
        ;

        $scope.closeAlert = function(index) {
          $scope.alerts.splice(index, 1);
        };
      }
    })

    .controller('SignUpCtrl', function($scope, $log, $state, $timeout, Users, Session) {
      $scope.alerts = [
      ];

      $scope.signup = function() {
        var user = new Users($scope.signUpInfo);
        user
          .$save()
          .then(function(data) {
            Session
              .authenticate($scope.signUpInfo)
              .$promise
              .then(function(data) {
                if (data) {

                  $scope.error = $scope.alerts.push(
                    {type: 'success', msg: "Welcome to Forge!"});

                  $timeout(function() {
                    $state.go('forge');
                  }, 2000);

                }
              })
              .catch(function(rejection) {
                $scope.error = $scope.alerts.push(
                  {type: 'danger', msg: rejection.data.error});
              })
            ;
          })
          .catch(function(rejection) {
            $scope.error = $scope.alerts.push(
              {type: 'danger', msg: rejection.data});
          });
      };

      $scope.closeAlert = function(index) {
        $scope.alerts.splice(index, 1);
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

    .controller('ModViewCtrl', function($scope) {

    })

    .controller('EeduLinkCtrl', function($scope) {

    })
  ;
})();
