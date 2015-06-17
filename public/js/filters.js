(function() {
  'use strict';

  forgeApp
    .filter('limit', function() {
      var DEFAULT_AMT = 20;

      return function(input, amt) {
        if (!amt) {
          amt = DEFAULT_AMT;
        }

        var str = input.substring(0, amt);

        if (input.length > amt) {
          str += '…';
        }

        return str;
      }
    })
  ;
})();
