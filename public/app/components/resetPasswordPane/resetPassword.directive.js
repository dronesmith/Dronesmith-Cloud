'use strict';

angular
  .module('ForgeApp')
  .directive('resetPasswordPane', function() {
    return {
      templateUrl: 'app/components/resetPasswordPane/resetPasswordPane.html',
      controller: 'resetPasswordPaneCtrl'
    }
  })
;
