'use strict';

var _ = require('underscore'),
    mongoose = require('mongoose');

// Some of the user data is going to be filtered for public API use.
exports.getPublicUserData = function(user) {
      var scope = user;

      if (scope instanceof Array) {
        var list = [];
        _.each(scope, function(value) {
          list.push({
            id:           value._id,
            email:        value.email,
            fullName:     value.fullName,
            company:      value.company,
            kind:         value.kind,
            Otherkind:    scope.Otherkind || "",
            created:      value.created,
            lastLogin:    value.lastLogin,
            userAgent:    value.userAgent,
            ipAddr:       value.ipAddr,
            drones:       value.drones || []
          })
        });
        return list;
      } else {
        return {
          id:           scope._id,
          email:        scope.email,
          fullName:     scope.fullName,
          company:      scope.company,
          kind:         scope.kind,
          Otherkind:    scope.Otherkind || "",
          created:      scope.created,
          lastLogin:    scope.lastLogin,
          userAgent:    scope.userAgent,
          ipAddr:       scope.ipAddr,
          drones:       scope.drones || []
        };
      }
};

exports.castDocumentId = function (value) {
    // using typeof and instance of because these values can be literals or instances
    if ((typeof(value) === 'string' || value instanceof String) && /^[0-9a-fA-F]{24}$/.test(value)) {
        return mongoose.Types.ObjectId(value);
    }
    else if (typeof(value) === 'number' || value instanceof Number || (!isNaN(value) && typeof(value) !== 'boolean')) {
        return Number(value);
    }
    else if (value instanceof mongoose.Types.ObjectId) {
        return value;
    }
};

exports._castQueryParameter = function (value) {
    if (value === 'null') {
        return null;
    }

    // XXX please evaluate for errors.
    return this.castDocumentId(value) | value;
};

exports.castQueryParameters = function (query) {
    for (var key in query) {
        if (query[key] instanceof Array || Array.isArray(query[key])) {
            for (var i = 0; i < query[key].length; i++) {
                if (query[key][i] instanceof Object) {
                    query[key][i] = this.castQueryParameters(query[key][i])
                }
                else {
                    query[key][i] = this._castQueryParameter(query[key][i]);
                }
            }
        }
        else if (query[key] instanceof Object) {
            query[key] = this.castQueryParameters(query[key]);
        }
        else {
            query[key] = this._castQueryParameter(query[key]);
        }
    }

    return query;
};

exports.scrubNull = function(object) {
  for (var k in object) {
    var n = '';
    for (var i = 0; i < k.length; ++i) {
      if (k[i] == '\0') {
        break;
      }
      n += k[i];
    }
    object[n] = object[k];
    object[k] = undefined;
    delete object[k];
  }
  return object;
}
