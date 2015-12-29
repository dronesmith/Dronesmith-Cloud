'use strict';

var
  cp = require('child_process'),
  log = require('./log.js').getLogger(__filename),
  config = require('../config/config');


exports.runScript = function(id, session) {
  var script = cp.spawn(config.programming.launcher,
    [config.programming.path, id]);

  session.script = script.pid;

  log.info('[SCRIPT] running from', session.script);
  // script.disconnect();

  script.on('close', function(code) {
    if (!isNaN(code)) {
      log.info('[SCRIPT] Process ended', code);
    } else {
      log.warn('[SCRIPT] Process ended abnormally from SIG', code);
    }
    session.script = null;
  });

  script.on('error', function(err) {
    log.error('[SCRIPT]', err);
    // script.disconnect();
    session.script = null;
  });

  script.stdout.on('data', function(data) {
    log.debug('[SCRIPT] STDOUT', data.toString());
  });

  script.stderr.on('data', function (data) {
    log.debug('[SCRIPT] STDERR', data.toString());
    session.script = 'error';
  });
};
