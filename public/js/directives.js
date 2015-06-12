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
              $('flight-dash').css({
                bottom: "0px"
              });
            });
          }
      };
    })
  ;
})();
