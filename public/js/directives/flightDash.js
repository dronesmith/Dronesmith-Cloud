(function() {
    'use strict';

    forgeApp.directive('flightDash', function(){
			return{
				restrict: 'E',
				templateUrl: 'js/directives/flightDash.html',
				link: function(scope, element, attr){
					$('div#close-dash').click(function(){
						$('flight-dash').animate({
							opacity: 0,
							bottom: "-250px"
						});
					});
				}
			};
		});
})();
