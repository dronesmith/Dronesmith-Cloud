(function() {
  'use strict';

  angular
    .module('Forge.services', [])
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

    .factory('Sync', ['Session', '$interval',
      function(Session, $interval) {
        var user = {},
          timer = null,
          SYNC_TIME = 5000*3;

        return {
          // This should be called when the mod has an event driven item
          // to sync with the DB
          onDemand: function(data) {
            if (!data.key || !data.chunk) {
              throw Error("All syncs require a key and a chunk!");
            }

            // XXX should we deep copy or can we get away with shallow?
            user = angular.copy(Object.byString(chunk, key));
          },

          // This should be used when you want to regularly sync a
          // certain chunk of data
          // TODO??? Worth it to add here, or just use $interval in a mod controller?
          // After all, if it's no longer the active mod, may still be doing this sync

          // addPeriodic: function(name, dataRef) {
          //   if (duration < 5000) {
          //     throw Error("Cannot sync under 5 seconds.");
          //     return;
          //   }
          //
          //   if (!data.key) {
          //     throw Error("All syncs require a key");
          //   }
          //
          //   if (!periodicSyncManager[name]) {
          //     // XXX should we deep copy or can we get away with shallow?
          //     periodicSyncManager[name].data = angular.copy(dataRef);
          //     periodicSyncManager[name].duration = angular.copy(duration);
          //
          //     $interval(function() {
          //       Session.sync(periodicSyncManager[name].data);
          //     }, periodicSyncManager[name].duration);
          //
          //   }
          // },
          //
          // removePeriodic: function(name) {
          //   if (syncManager[name]) {
          //     delete syncManager[name];
          //   }
          // },

          launch: function() {
            user = {};

            timer = $interval(function() {
              Session
                .sync(user)
                .$promise
                // no error, remove newly added Data
                .then(function() {
                  user = {};
                })
              ;
            }, SYNC_TIME);
          },

          end: function() {
            $interval.cancel(timer);
          }
      };
    }])

    // .factory('Prefs', ['$resource',
    //   function($resource) {
    //     return $resource('/api/prefs', {
    //     }, {
    //       sync: {
    //         method: 'PUT'
    //       },
    //       authenticate: {
    //         method: 'POST'
    //       }
    //     });
    //   }])
    ;
})();
