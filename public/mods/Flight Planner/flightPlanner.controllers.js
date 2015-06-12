(function(){
	'use strict';

	forgeApp.controller('FlightPlannerCtrl', function($scope){
		$scope.waypoints=[
			{name: "Take off", action: "Lift off + Move to Next", task: "Lift off, hover", time:"00:30"},
			{name: "Point A", action: "Move to point B", task: "Increase atl, hover", time:"00:30"},
			{name: "Point B", action: "Move to point C", task: "Record Video, hover", time:"00:30"},
			];
	})

	;
})();