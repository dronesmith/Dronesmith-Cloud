'use strict';

angular
  .module('ForgeApp')
  .directive('uploader', function() {
    return {
      templateUrl: 'app/components/uploader/uploader.html',
      controller: 'UploaderCtrl'
    }
  })
;
