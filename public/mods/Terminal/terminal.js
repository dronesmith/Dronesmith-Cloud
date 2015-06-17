(function(){
	'use strict';

	forgeApp
		.controller('terminalCtrl', ['$scope','$timeout',
			function($scope, $timeout) {

				$scope.world = "";

				// TODO this needs to be reafactored.
				// For now, just got the terminal in order.

				$scope.languages = [
					{'name': 'Javascript',
					 'sampleCode': 	"var text = 'Hello World';\n" +
					 				"console.log(text);\n"
					},
					{'name': 'C/C++',
					 'sampleCode': 	"#include <iostream>\n\n" +
									"int main(int argc, char* argv[]) {\n\n" +
									"	std::cout << \"Hello World\\r\\n\";\n\n" +
									"	return 0;\n" +
									"}"
					}
				];

				$scope.language = $scope.languages[0];
				var editor = null;
				var con = null;

				$scope.editorOptions = {
					theme:'twilight',
					animatedScroll: true,
					showPrintMargin: false,
					mode: $scope.language.name.toLowerCase(),
					onLoad: function (_editor) {
						editor = _editor;
						var _session = _editor.getSession();
						var _renderer = _editor.renderer;

						_editor.setUndoManager(new ace.UndoManager());
						_eidtor.getUndoManager().reset();

						_editor.setShowPrintMargin(false);

						$scope.languageChanged = function() {
							console.log(_session);
							if($scope.language.name === 'C/C++'){
								_session.setMode("ace/mode/" + 'c_cpp');
							}
							else{
								_session.setMode("ace/mode/" + $scope.language.name.toLowerCase());
							}
						};
					}
				};

				$scope.consoleOptions = {
					theme:'twilight',
					animatedScroll: true,
					showPrintMargin: false,
					showLineNumbers: false,
					readonly: true,
					onLoad: function (_editor) {
						con = _editor;
					}
				};


				// HACK! Need to fix this
				var oldLog = console.log;
				console.log = function (message) {
					$scope.world += message + '\n';
					oldLog.apply(console, arguments);
				};


				// undo button
				$scope.undoBtn = function() {
					editor.undo();
				};

				$scope.redoBtn = function() {
					editor.redo();
				}

				// run and reset button
				$scope.run = function(){
					if($scope.language.name === 'C/C++') {
						$scope.world = [];
						$scope.world.push("[ERROR] C/C++ currently not supported by forge.\r\n");
						return;
					}
					if( $('div.ace_error').is(':visible') ){
						$scope.dynamic = 100;
						$scope.type = 'danger';
						$scope.message = 'Compiler Error :('
						$timeout(function(){$scope.world = 'Syntax error'}, 600);
					}
					else{
						$scope.dynamic = 100;
						$scope.message = 'Compiled Successfully :)';
						$scope.type = 'success';
						$scope.world = [];

						// HACK
						// quick and dirty.
						try {
							(new Function (editor.getSession().getValue()))();
						} catch(e) {
							$scope.world = '';
							$scope.world += "[Error] " + e;
							$scope.dynamic = 100;
							$scope.type = 'danger';
							$scope.message = 'Compiler Error :(';
						}

					}
				};

				$scope.reset = function(){
					$scope.dynamic = 0;
					$scope.type = null;
					$scope.world = '';
					$scope.message = '';
				};


    }])
  ;
})();
