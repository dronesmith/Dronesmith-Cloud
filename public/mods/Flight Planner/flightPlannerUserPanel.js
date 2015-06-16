(function(){
	'use strict';

	forgeApp.directive('flightPlannerUserPanel', function(){
			return{
				restrict: 'E',
				templateUrl: 'js/directives/flightPlannerUserPanel.html',
				link: function(scope, element, attrs){
					$('a#toggleSwitch').click(function(event){
						event.preventDefault();
						event.stopImmediatePropagation();

						$(this).toggleClass('active');
						$('#panel').toggle('blind', {direction: 'right'});
					});
				}
			};
		});
})();