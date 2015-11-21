'use strict';

angular
  .module('ForgeApp')
  .factory('Session', function(
    $resource) {

    return $resource('/index/session', {

    }, {
      sync: {
        method: 'PUT'
      },
      authenticate: {
        method: 'POST'
      }
    })
  })
;
