(function() {
    'use strict';

    forgeApp.directive('flightDash', function(){

			return{
				restrict: 'E',
				templateUrl: 'js/directives/flightDash.html',
				link: function(scope, element, attr){
					angular.element('div#close-dash').click(function(){
						angular.element('flight-dash').animate({
							opacity: 0,
							bottom: "-250px"
						});
					});
				}
			};
		});
})();
