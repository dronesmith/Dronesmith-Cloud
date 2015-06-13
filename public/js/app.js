(function() {
  'use strict';

  // Utilities

  Object.byString = function(o, s) {
    s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
    s = s.replace(/^\./, '');           // strip a leading dot
    var a = s.split('.');
    for (var i = 0, n = a.length; i < n; ++i) {
        var k = a[i];
        if (k in o) {
            o = o[k];
        } else {
            return;
        }
    }
    return o;
  };

  angular
    .module('Forge', [
      'Forge.controllers',
      'Forge.services',
      'Forge.directives',
      'Forge.filters',
      'ngRoute',
      'ngResource',
      'ui.router',
      'ngAnimate',
      'ui.bootstrap'
    ])

    .config(function(
      $httpProvider,
      $provide,
      $stateProvider,
      // $urlRouterProvider,
      $locationProvider) {

      $provide.factory('ServerErrorInterceptor',
        function($q, $injector, $rootScope) {
          return {
            response: function(response) {
              return response || $q.when(response);
            },

            responseError: function(rejection) {
              if (rejection.status === 500) {

                // TODO this is cheap. Find a better solution.
                // Note that $stateParams doesn't work.
                $rootScope.ServerError = rejection.data;

                $injector
                  .get('$state')
                  .go('error');
              } else if (rejection.status === 400) {
                $rootScope.$broadcast('alert:fail', rejection.data);
              }

              return $q.reject(rejection);
            }
          };
        })
      ;

      $stateProvider
        .state('forge', {
          url:            '/',
          templateUrl:    'views/forge.html',
          controller:     'ForgeCtrl'
        })
        .state('login', {
          templateUrl:    'views/login.html',
          controller:     'LoginCtrl'
        })
        .state('error', {
          templateUrl:    '500.html',
          controller:     'ErrorCtrl'
        })
        .state('signup', {
          templateUrl:  'views/signup.html',
          controller:   'SignUpCtrl'
        })
      ;

      // FIXME not sure why this isn't working...
      // urlRouterProvider.otherwise('/');

      $locationProvider.html5Mode(true);
      $httpProvider.interceptors.push('ServerErrorInterceptor');
    })
  ;
})();
