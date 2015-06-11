(function(){
	'use strict';

	forgeApp.controller('AceCtrl', ['$scope','$timeout', function($scope, $timeout, UAVManager){
		$scope.languages = [
			{'name': 'Javascript',
			 'sampleCode': 	"var word = 'Hello World';\n" +
			 				"console.log(word);\n"
			},
			// {'name': 'HTML',
			//  'sampleCode': 	"<!DOCTYPE html>\n" +
			// 				"<html>\n" +
			// 				"<body>\n" +
			// 				"<h1>This is heading 1</h1>\n" +
			// 				"</body>\n" +
			// 				"</html>"},
			{'name': 'C/C++',
			 'sampleCode': 	"#include <iostream>\n\n" +
							"int main(int argc, char* argv[]) {\n\n" +
							"	std::cout << \"Hello World\\r\\n\";\n\n" +
							"	return 0;\n" +
							"}"}
			];

		$scope.language = $scope.languages[0];

		// ============== editor setting =============== //
		$scope.aceOption = {
			mode: $scope.language.name.toLowerCase(),
			onLoad: function (_ace){
				$scope.languageChanged = function(){
					if($scope.language.name === 'C/C++'){
						_ace.getSession().setMode("ace/mode/" + 'c_cpp');
					}
					else{
						_ace.getSession().setMode("ace/mode/" + $scope.language.name.toLowerCase());
					}
				};
			}
		};

		var editor = ace.edit('editor');

		editor.setTheme('ace/theme/twilight');
		editor.setShowPrintMargin(false);

		$scope.undos = new ace.UndoManager();
		$scope.undos.reset();

		var oldLog = console.log;
		console.log = function (message) {
			$scope.world.push(message);
			oldLog.apply(console, arguments);
		};
		// ============== editor setting =============== //


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
				$scope.message = 'compile error'
				$timeout(function(){$scope.world = 'Syntax error'}, 600);
			}
			else{
				$scope.dynamic = 100;
				$scope.message = 'Compiled Sucess :)';
				$scope.type = 'success';
				$scope.world = [];

				// quick and dirty.

				try {
					(new Function (editor.getSession().getValue()))();
				} catch(e) {
					$scope.world.push("[Error] " + e);
					$scope.dynamic = 100;
					$scope.type = 'danger';
					$scope.message = 'Compiler Error :(';
				}

				// $timeout(function(){$scope.world = 'Hello World'}, 600);
			}
		};
		$scope.reset = function(){
			$scope.dynamic = 0;
			$scope.type = null;
			$scope.world = [];
		};
		// above section is for running or resetting terminal


        }])
        ;
})();
