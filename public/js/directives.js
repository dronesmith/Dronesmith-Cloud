(function() {
  'use strict';

  forgeApp
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
          controller: 'EeduLinkCtrl',
          link: function(scope, element, attr){
            element.css({
              cursor: "pointer"
            });

            element.click(function(){
              angular.element('flight-dash').css({
                opacity: 1,
                bottom: "0px"
              });
            });
          }
      };
    })
  ;
})();
