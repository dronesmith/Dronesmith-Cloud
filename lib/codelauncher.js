/**
 * Dronesmith Cloud
 *
 * Principle Engineer: Geoff Gardner <geoff@dronesmith.io>
 *
 * Copyright (C) 2016 Dronesmith Technologies Inc, all rights reserved.
 * Unauthorized copying of any source code or assets within this project, via
 * any medium is strictly prohibited.
 *
 * Proprietary and confidential.
 */

'use strict';

var
  cp = require('child_process'),
  path = require('path'),
  log = require('./log.js').getLogger(__filename),
  config = require('../config/config'),
  events = require('events');

  var
    emitter = new events.EventEmitter();

exports.runScript = function (id, session, snippet, customPath) {
  var script;
  var codePath;

  if (customPath) {
    codePath = customPath;
  } else {
    codePath = path.resolve(config.programming.path);
  }

  if (snippet) {
    script = cp.spawn(config.programming.launcher,
      [codePath, '--code', snippet]);
  } else {
    script = cp.spawn(config.programming.launcher,
      [codePath, '--id', id]);
  }

  session.script = script.pid;

  log.info('[SCRIPT] running from', session.script);
  emitter.emit('code:update', 'Running job ' + session.script + '...');
  // script.disconnect();

  script.on('close', function (code) {
    if (!isNaN(code)) {
      log.info('[SCRIPT] Process ended', code);
      emitter.emit('code:update', 'App ended with exit code ' + code + '.');
    } else {
      log.warn('[SCRIPT] Process ended abnormally from SIG', code);
    }
    session.script = null;
  });

  script.on('error', function (err) {
    log.error('[SCRIPT]', err);
    // script.disconnect();
    session.script = null;
  });

  script.stdout.on('data', function (data) {
    log.debug('[SCRIPT] STDOUT', data.toString());
    emitter.emit('code:update', data.toString());
  });

  script.stderr.on('data', function (data) {
    log.debug('[SCRIPT] STDERR', data.toString());
    emitter.emit('code:update', data.toString());
    session.script = 'error';
  });
};

exports.getEmitter = function () {
  return emitter;
};
