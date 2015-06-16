(function() {
  'use strict';

  forgeApp
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

    .controller('ForgeCtrl', function($scope, $log, $state, Session, Sync) {
      $scope.userInfo = null;

      // Events going to modView
      $scope.$on('modView', function(ev, data) {
        $scope.$broadcast(data.from, data.action);
      })

      Session
        .get({}, function(data) {
          $scope.userInfo = data.userData || null;
          if (!$scope.userInfo) {
            $state.go('login');
          } else {
            $scope.$broadcast('session:update', $scope.userInfo);
            Sync.launch();
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
      $scope.userInfo = null;

      $scope.$on('session:update', function(ev, sessionData) {
        $scope.userInfo = sessionData;
      });

      $scope.toggleSidePanel = function() {
        // emit event to modView
        $scope.$emit('modView',
          {from: 'communityBar', action: 'toggleSidePanel'});
      }

      $scope.logout = function() {
        Session
          .authenticate({deauth: true})
          .$promise
          .then(function(data) {
            if (!data.userData) {
              $state.go('login');
              Sync.exit();
            }
          });
      };
    })

    .controller('ModViewCtrl', function($scope, Session, $http, $compile) {
      $scope.mods = [];
      $scope.activeMod = null;
      $scope.showSidePanel = true;

      $scope.changeActiveMod = function(view) {
        $scope.activeMod = $scope.mods[view];

        // dynamically add mod view.
        $http
          .get($scope.activeMod.index + '.html')
          .success(function(data) {
            $http
              .get($scope.activeMod.index + '.js')
              .success(function(js) {

                // Load mod!
                // HACK
                angular.element('#activeModScript').html('<script>' + js + '</script>');
                registerController('Forge', $scope.activeMod.controller);
                // FIXME just adding this here for demo purposes. We need to add controller deps as array.
                // Extremely ugly, needs to be cleared after demo.
                if ($scope.activeMod.name == 'Tag Cam') registerController('Forge', 'TagModalCtrl');
                angular.element('#activeMod').html($compile(data)($scope));
              })
          })
          .error(function(data) {
            angular.element('#activeMod').append('Failed to load ' + $scope.activeMod.index);
          });
      };

      $scope.$on('session:update', function(ev, sessionData) {
        $scope.mods = sessionData.mods;

        if (!$scope.activeMod && $scope.mods.length > 0) {
          // TODO this is pref data to be synced.
          $scope.activeMod = $scope.mods[0];
        }
      });

      $scope.$on('communityBar', function(ev, data) {
        if (data == 'toggleSidePanel') {
          $scope.showSidePanel = !$scope.showSidePanel;
        }
      });
    })

    .controller('EeduLinkCtrl', function($scope) {

    })
  ;
})();
