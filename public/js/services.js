(function() {
  'use strict';

  forgeApp
    .factory('Users', ['$resource',
      function($resource) {
        return $resource('/api/user/:id', {
          userId: '@_id'
        }, {
          update: {
            method: 'PUT'
          }
        });
      }])

    .factory('Session', ['$resource',
      function($resource) {
        return $resource('/api/session', {
        }, {
          sync: {
            method: 'PUT'
          },
          authenticate: {
            method: 'POST'
          }
        });
      }])
    ;
})();
