(function() {
  'use strict';

  forgeApp
    // View Controllers
    .controller('ErrorCtrl', function($scope, $rootScope) {
      $scope.error = $rootScope.ServerError
        || "The server didn't send back anything.";
    })

    .controller('AppCtrl', function($scope, $rootScope, $timeout) {
      $scope.alerts = [];
      $scope.timers = [];
      $scope.appLoaded = false;
      $scope.vodBlur = {};

      $scope.$on('blur', function(ev, data) {
        $scope.vodBlur = data;
      });

      $scope.$on('alert:fail', function(ev, data) {
        $scope.addAlert(data.error || data);
      })

      $scope.closeAlert = function(index) {
        $scope.alerts.splice(index, 1);
      };

      $scope.addAlert = function(msg, kind) {
        $scope.alerts.push(
          {type: kind || 'danger',
          msg: msg || 'bad request',
          position: {'border-radius': '5px',
          'position': 'absolute',
          'z-index': '10000',
          'margin-left': '5px',
          // 'padding': '5px 5px 5px 5px',
          'margin-top': +(5+$scope.alerts.length*76)}});

        $scope.timers.push($timeout(function() {
          $scope.alerts.shift();
          $scope.timers.shift();
        }, 5000));
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
          // console.log("got here");
          if (!$scope.userInfo) {
            $state.go('login');
          } else {

            angular.element('#appLoaded').empty();
            ga('set', '&uid', $scope.userInfo.id);
            $scope.$broadcast('session:update', $scope.userInfo);
            // Sync.launch();
          }
        });
    })

    .controller('LoginCtrl', function($scope, $log, $state, Session) {

      $scope.updateVodBlur = function(blur) {
        // $scope.vodBlur = { '-webkit-animation': '0.5s blurOnLogin'};
        // $scope.clsName = {'filter': 'blur(20px)' };

        $scope.$emit('blur', blur ? {'-webkit-animation': '3s blurOnLogin forwards' } :
        { } );

        // $scope.vodBlur = {'-webkit-animation': '2s blurOnLogin forwards' };
      };

      $scope.login = function() {
        // TODO probably some kind of auth service that rests on top of session resource.
        Session
          .authenticate($scope.loginInfo)
          .$promise
          .then(function(data) {
            angular.element('#loginVideo').empty();
            $state.go('forge');
          })
        ;
      };
      $scope.forgotPassword = function() {
        $state.go('forgotpassword');
      };
      //not used
      // $scope.logInValid = function(valid) {
      //   if(valid){
      //     $scope.login();
      //   }
      //   else {
      //     //alert("Please enter a valid email and password"); TODO see signUpValid()
      //   }
      // };
    })

    .controller('ConfirmCtrl', function($scope, $log, $state, $stateParams, $timeout) {
      if ($stateParams.onWaitList) {
        $scope.messageHeader = "You've missed the early access!";
        $scope.message = "We've put you on the waitlist, however. We may extend the early access to you, and we'll be sure to send you updates as Forge matures.";
      } else {
        $scope.messageHeader = "Thanks for signing up!";
        $scope.message = "We've emailed you your early access code. You'll need to verify your account in order be apart of the early access.";
      }

      $scope.goLogin = function() {
        $state.go('login');
      }
    })

    .controller('ForgotCtrl', function($scope, $log, $state, $timeout, Users, Session){
      $scope.goLogin = function() {
        $state.go('login');
      };

      $scope.forgotPassword = function() {
        Users
          .forgotPassword($scope.forgotInfo)
          .$promise
          .then(function(data) {
            $state.go('confirmResetPassword');
          });
        };

      $scope.messageHeader = "Your password is on its way!";
      $scope.message = "We've emailed a new password to the email on file. Use this new password to login to Forge. ";

      $scope.goLogin = function() {
        $state.go('login');
      };

      })

    .controller('SignUpCtrl', function($scope, $log, $state, $timeout, Users, Session) {

      $scope.signup = function() {
        var user = new Users($scope.signUpInfo);
        user
          .$save()
          .then(function(data) {

            $state.go('confirm', data);

            // Session
            //   .authenticate($scope.signUpInfo)
            //   .$promise
            //   .then(function(data) {
            //     angular.element('#appLoaded').remove();
            //     $state.go('forge');
            //
            //   })
            // ;
          })
        ;
      };
      //not used
      // $scope.signUpValid = function(valid) {
      //   if(valid){
      //     $scope.signUp();
      //   }
      //   else {
      //     //alert("Please fill out all fields"); TODO probably error next to login button (ngif triggered by variable set true here)
      //   }
      // };
    })

    // Directive Controllers

    .controller('CommunityBarCtrl', function($scope, $state, Session, Sync, $modal) {
      $scope.userInfo = null;

      $scope.$on('session:update', function(ev, sessionData) {
        $scope.userInfo = sessionData;
      });

      $scope.toggleSidePanel = function() {
        // emit event to modView
        $scope.$emit('modView',
          {from: 'communityBar', action: 'toggleSidePanel'});
      };

      $scope.editAccount = function() {
        var modalInstance = $modal.open({
          templateUrl: 'editAccountModal.html',
          controller: 'EditAccountModalCtrl',
          resolve: {
            userAccount: function() { return $scope.userInfo;  }
          }
        });

        // modalInstance.result.then(function (selectedItem) {
        // }, function () {
        // });
      };

      $scope.logout = function() {
        // console.log($scope.userInfo);
        Session
          .authenticate({
            email: $scope.userInfo.email,
            deauth: true
          })
          .$promise
          .then(function(data) {
            if (!data.userData) {
              $state.go('login');
              Sync.end();
              angular.element("#appLoaded").html(
              '<video id="loginVideo" autoplay poster="http://skyworksas.com/wp-content/uploads/2014/11/mainbg-e1432778362398-2560x1344.jpg" preload="none" muted loop>'+
              '<source src="vod/forgenoblur.mp4" type="video/mp4">'+
              '<img src="http://skyworksas.com/wp-content/uploads/2014/11/mainbg-e1432778362398-2560x1344.jpg" alt="video-fallback">'+
              '</video>');
            }
          });
      };
    })

    .controller('EditAccountModalCtrl', function($scope, $modalInstance, userAccount, Session, Users) {

        // always poll session since it may have been updated.
        Session.get({}, function(data) {
            $scope.userAccount = data.userData;
        });

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

        Users
          .update($scope.userAccount)
          .$promise
          .then(function(data) {
            // Need to remove the tender fields due to caching.
            $scope.userAccount.password = null;
            $scope.userAccount.newPassword = null;
            $scope.userAccount.confirmPassword = null;
            $modalInstance.close();
          })
        ;
      };

      $scope.cancel = function() {
        $modalInstance.dismiss('cancel');
      };
    })

    .controller('ModViewCtrl', function($scope, Session, Users, $http, $compile, FileUploader) {
      $scope.mods = [];
      $scope.activeMod = null;
      $scope.showSidePanel = true;

      $scope.userInfo = null;
      $scope.uploadKind = 'mavlink';

      $scope.uploadStatus = "Unknown";

      $scope.uploaded = false;

      var uploader = $scope.uploader = new FileUploader({
           url: '/api/mission/' + $scope.uploadKind
       });

       $scope.resetUploader = function() {
         uploader.destroy();
         uploader = $scope.uploader = new FileUploader({
              url: '/api/mission/' + $scope.uploadKind
          });

          $scope.uploadStatus = "Unknown";
          $scope.uploaded = false;
       };

       $scope.changeUploader = function(name) {
         $scope.uploadKind = name;
         uploader.clearQueue();
         uploader.url = '/api/mission/' + name;
        //  $scope.uploader = uploader;
       }

       uploader.onProgressItem = function(fileItem, progress) {
            // console.info('onProgressItem', fileItem, progress);
            if (progress == 100) {
              $scope.uploaded = true;
            }
        };

        uploader.onProgressAll = function(progress) {
            console.info('onProgressAll', progress);
        };
        uploader.onSuccessItem = function(fileItem, response, status, headers) {
            // console.info('onSuccessItem', fileItem, response, status, headers);

            $http
              .put('/api/drone/addMission/' + $scope.selectedDrone._id, {missionId: response.id})
              .success(function(res) {
                $scope.uploadStatus = response;
              })
              .error(function(res) {
                $scope.uploadStatus = {error: "Could not complete."};
              })
            ;
        };
        uploader.onErrorItem = function(fileItem, response, status, headers) {
            // console.info('onErrorItem', fileItem, response, status, headers);
            $scope.uploadStatus = response;
        };

        // uploader.onAfterAddingFile = function(item) {
        //   // uploader.formData.push($scope.selectedDrone._id);
        //   console.log(uploader);
        // }

        Session.get({}, function(data) {
          $scope.userInfo = data.userData;

          Users
            .get({id: $scope.userInfo.id})
            .$promise
            .then(function(data) {
              $scope.user = data;
              $scope.selectedDrone = $scope.user.drones[0];
            });
        });

      $scope.changeActiveMod = function(view) {
        $scope.activeMod = $scope.mods[view];

        // console.log($scope.userInfo);

        $scope.userInfo.events.push({
          kind: 'Mod Select',
          params: {
            name: $scope.activeMod
          }
        });

        Users.update({id: $scope.userInfo.id}, $scope.userInfo);

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
                if ($scope.activeMod.name == 'Hangar') registerController('Forge', 'CalibModalCtrl');

                angular.element('#activeMod').html($compile(data)($scope));
              })
          })
          .error(function(data) {
            angular.element('#activeMod').append('Failed to load ' + $scope.activeMod.index);
          });
      };

      $scope.$on('session:update', function(ev, sessionData) {
        $scope.mods = sessionData.mods;

        if (!$scope.activeMod && $scope.mods && $scope.mods.length > 0) {
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
