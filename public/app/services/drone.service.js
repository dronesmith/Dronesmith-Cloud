'use strict';

angular
  .module('ForgeApp')
  .factory('Drone', function(
    $resource) {

    return $resource('/index/drone/:id', {
    }, {
      addMission: {
        method: 'PUT',
        url: '/index/drone/addMission'
      }
    });
  })
;
