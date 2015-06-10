(function() {
  'use strict';

  angular
    .module('Forge.directives', [])
    
    .directive('communityBar', function() {
      return {
          restrict: 'E',
          templateUrl: 'views/partials/community-bar.html',
          controller: 'CommunityBarCtrl'
      };
    })

    .directive('modView', function() {
      return {
          restrict: 'E',
          templateUrl: 'views/partials/mod-view.html',
          controller: 'ModViewCtrl'
      };
    })

    .directive('eeduLink', function() {
      return {
          restrict: 'E',
          templateUrl: 'views/partials/eedu-link.html',
          controller: 'EeduLinkCtrl'
      };
    })
  ;
})();
