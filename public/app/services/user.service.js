'use strict';

angular
  .module('ForgeApp')
  .factory('User', function(
    $resource) {

    return $resource('/index/user', {

    }, {
      update: {
        method: 'PUT'
      },
      forgotPassword: {
        method: 'PUT',
        url: '/index/user/forgotPassword'
      }
    })
  })
;
