(function(){
	'use strict';

	forgeApp.directive('userPanel', function(){
			return{
				restrict: 'E',
				templateUrl: 'js/directives/userPanel.html',
				link: function(scope, element, attrs){
					$('a#toggleSwitch').click(function(event){
						event.preventDefault();
						event.stopImmediatePropagation();

						$(this).toggleClass('active');
						$('ul#panel').toggle('blind', {direction: 'right'});				
					});
				}
			};
		});
})();
