'use strict';

angular
  .module('ForgeApp')
  .factory('Mission', function(
    $resource) {

    return $resource('/index/mission', {
      id: '@id'
    })
  })
;
