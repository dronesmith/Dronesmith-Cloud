(function() {
    'use strict';
	forgeApp.controller('BlocksCtrl', ['$scope', '$interval', 'Cloudbit',
    function($scope, $interval, Cloudbit){
			var Blocks = [
                {"name" : "Block 1",
                 "text" : "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including ve"},
                {"name" : "Block 2",
                 "text" : "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s"},
                {"name" : "Block 3",
                 "text" : "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s"},
                 ];

     $scope.updateCloudBit = function() {
       Cloudbit
        .get()
        .$promise
        .then(function(data) {
          $scope.cloudbitModel = data;
          $scope.updateValue = data.subscribers[0].data.input.percent.$cgte;
        });
     };

     $scope.cloudbitParams = {
       percent: 50,
       timeToLive: 5000
     };

     $scope.postCloudBit = function() {

       var cb = new Cloudbit($scope.cloudbitParams);
       cb
         .$save()
         .then(function(data) {
           if (data && data.success) {
             console.log('yay!');
           } else {
             console.log('no :(');
           }
         })
       ;
     };


     $interval($scope.updateCloudBit, 5000);


     $scope.list1 = {title: 'AngularJS - Drag Me'};
     $scope.list2 = {};

            //avoid Angular runs dirty checking
            angular.forEach(Blocks,function(){
                $scope.blocks = Blocks;
            });
		}])
	;
})();
