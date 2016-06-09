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

module.exports = function(grunt) {

  // monitor grunt task usage
  require('time-grunt')(grunt);

  // Project configuration.
  grunt.initConfig({
  	pkg: grunt.file.readJSON('package.json'),
	env : {
		options : {
			//Shared Options goes here
		},
		dev : {
			NODE_ENV : 'development'
		},
		test : {
			NODE_ENV : 'test'
		}
	},
	concurrent: {
		dev: {
			tasks: ['nodemon', 'node-inspector', 'watch:server'],
			options: {
				logConcurrentOutput: true
			}
		}
	},
	'node-inspector': { //TODO -
		dev: {
			options: {
				'web-port' : 10000
			}
		}
	},
	nodemon: {
		dev: {
			script: 'app.js',
			options : {
				nodeArgs: ['--debug'],
				ignore: ['node_modules/**', '**/lib/**'],
				env: {
					//NODE_ENV: 'test',
					NODE_ENV: 'development',
				},
				callback: function(nodemon) {
					//log
					nodemon.on('log', function(event) {
						console.log(event.colour);
					});

					// restart browser when server reboot
					nodemon.on('restart', function() {
						setTimeout(function() {
							require('fs').writeFileSync('.rebooted', 'rebooted');
						}, 1000);
					});
				}
			},
		}
	},
	less: {
  		development: {
    		options: {
      			paths: ["public/lib/bootstrap/less"]
    		},
    		files: {
      			"public/lib/bootstrap/dist/css/bootstrap-theme.css": "public/lib/bootstrap/less/bootstrap.less"
    		}
  		}
  	},
	watch: {
		server: {
			files: [
				'app.js',
				'config.js',
				'properties.json',
				'lib/**/*.js',
				'public/**/*.js',
				'public/**/*.css',
				'public/**/*.html',
			],
			options: {
				nospawn : true,
				livereload: true
			}
		}
	},
	external_daemon: {
		mongodb: {
			cmd: 'mongod',
			args: []
		}
	},
	clean: ['.tmp', 'dist']
  });

  // dev stuff
  grunt.loadNpmTasks('grunt-env');
  grunt.loadNpmTasks('grunt-concurrent');
  grunt.loadNpmTasks('grunt-node-inspector');
  grunt.loadNpmTasks('grunt-nodemon');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-external-daemon');
  grunt.loadNpmTasks('grunt-contrib-less');

  // build stuff
  // TODO

  // server task
  grunt.registerTask('serve', ['concurrent:dev']);


  // test
  // TODO - units, e2e, coveralls

  // build
  // TODO

  // docs task
  // TODO

  // all task
  grunt.registerTask('all', ['clean', 'docs-wo-clean', 'build-wo-clean', 'external_daemon:mongodb']);

};
