'use strict';

var mongoose = require('mongoose'),
    Code = mongoose.model('Code'),
    Drone = mongoose.model('Drone'),
    log = require('../log.js').getLogger(__filename),
    Q = require('q'),
    async = require('async'),
    _ = require('underscore'),
    utils = require('../utils'),
    launcher = require('../codelauncher')

    ;


exports.exec = function(req, res, next) {
  Code
    .findOne({_id: utils.castDocumentId(req.params.id)})
    .exec(function(err, code) {
    if (err) {
      return res.status(500).json({error: err});
    } else if (!code) {
      return res.status(400).json({error: "No snippet found."});
    }
    // invoke the launcher
    launcher.runScript(req.params.id, req.session);
    return res.json(code);
  });
};

exports.create = function(req, res, next) {
    var code = new Code(req.body);
    var errors = req.validationErrors();

    if (!req.params.drone) {
      errors.drone = 'Drone Id required.';
    }

    if (errors) {
      log.error(errors);
      return res.status(400).json({error: errors});
    }

    Drone
      .findOne({_id: req.params.drone})
      .exec(function(err, data) {
        if (err) {
          return next(err);
        } else if (!data) {
          errors.drone = 'No drone with associated Id.';
        } else {
          code.save(function(err) {
            if (err) {
              return next(err);
            } else {
              data.snippets.push(code);
              data.save(function(err) {
                if (err) {
                  errors.db = err;
                } else {
                  return res.status(200).json(code);
                }
              });
            }
          })
        }
      })
    ;

    if (errors) {
      log.error(errors);
      return res.status(400).json({error: errors});
    }
};

exports.update = function(req, res, next){
  req.body.updated = new Date();

  Code
    .findOneAndUpdate(
    {_id: utils.castDocumentId(req.params.id)},
    req.body,
    function(err, code) {
      if (err) {
        return res
          .status(400)
          .json({error: err});
      } else {
        return res.json(code);
      }
    });
};

exports.find = function(req, res, next) {
  Code
    .findOne({_id: utils.castDocumentId(req.params.id)})
    .exec(function(err, code) {
    if (err) {
      return res.status(500).json({error: err});
    } else if (!code) {
      return res.status(400).json({error: "No snippet found."});
    }
    return res.json(code);
  });
};

exports.findAll = function(req, res, next) {
  var query = null,
    findQuery = {},
    skip = null,
    attribs = {
    }
    ;

  for (var k in req.query) {
    var prop = req.query[k];

    if (k == 'size' || k == 'page') {
      attribs[k] = +prop;
      continue;
    }

    if (k == 'sort') {
      var subProp = prop.substring(1);
      var prefix = prop[0];
      attribs[k] = {};

      if (prop == 'id') prop = '_id';
      if (subProp == 'id') subProp = '_id';

      if (prefix == '-') {
        attribs[k][subProp] = -1;
      } else {
        attribs[k][prop ] = 1;
      }
      continue;
    }

    findQuery[k] = prop;
  }

  // cast numerics
  for (var k in findQuery) {
    if (!isNaN(findQuery[k])) {
      findQuery[k] = +findQuery[k];
    }
  }

  // NOTE we don't want to return parameters for all.
  query = Code.find(findQuery);

  if (attribs.sort) {
    query = query.sort(attribs.sort);
  }

  if (attribs.page && attribs.page > 0 && attribs.size) {
    skip = (attribs.page-1) * attribs.size;
    query = query.skip(skip);
  } else {
    attribs.page = null;
  }

  if (attribs.size && attribs.size > 0) {
    query = query.limit(attribs.size);
  }

  query.exec(
    function(err, codes) {
      if (err) {
        return next(err);
      } else {
        Code.count(findQuery, function(err, total) {
          if (err) {
            return next(err);
          } else {
            var retobject = {
              total:  total
            };

            if (attribs.size == 0) {
              retobject.size = 0;
              retobject.page = null;
              retobject.codes = [];
            } else {
              if (skip > total) {
                skip = total;
              }

              if (attribs.size > total) {
                retobject.size = total;
              } else if (attribs.page > 0 && (attribs.size > (total - skip))) {
                retobject.size = total - skip;
              } else {
                retobject.size = attribs.size || total;
              }
              retobject.page = attribs.page || null;
              retobject.snippets = codes;
            }

            return res.json(retobject);
          }
        });
      }
     });
};

exports.remove = function(req, res, next) {
  Code
    .findOneAndRemove({_id: utils.castDocumentId(req.params.id)},
      function(err, code) {
        if (err) {
          return res
            .status(400)
            .json({error: err});
        } else {
          return res.json({status: 'OK'});
        }
    });
};
