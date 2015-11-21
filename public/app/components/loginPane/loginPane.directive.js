'use strict';

angular
  .module('ForgeApp')
  .directive('loginPane', function() {
    return {
      templateUrl: 'app/components/loginPane/loginPane.html',
      controller: 'LoginPaneCtrl'
    }
  })
;
