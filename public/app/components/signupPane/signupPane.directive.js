'use strict';

angular
  .module('ForgeApp')
  .directive('signupPane', function() {
    return {
      templateUrl: 'app/components/signupPane/signupPane.html',
      controller: 'signupPaneCtrl'
    }
  })
;
