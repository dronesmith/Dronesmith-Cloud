'use strict';

angular
  .module('ForgeApp')
  .directive('navbar', function() {
    return {
      templateUrl: 'app/components/navbar/navbar.html',
      controller: 'NavbarCtrl'
    }
  })
;
