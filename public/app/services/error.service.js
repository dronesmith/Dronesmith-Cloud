'use strict';

angular
  .module('ForgeApp')
  .factory('Error', function($state, $uibModal) {

    return function(error, kind) {
      switch (kind) {
        case 'session:null': $state.go('login'); break;
        default:
          // error modal
          $uibModal.open({
            animation: true,
            templateUrl: 'app/components/errorModal/errorModal.html',
            controller: 'ErrorModalCtrl',
            resolve: {
              error: function() { return error }
            }
          });
          break;
      }

    };
  })
;
