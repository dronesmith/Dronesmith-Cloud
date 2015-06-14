(function() {
    'use strict';
    var Projects = [
        {"projectName" : "project one", "projectType" : "", "projectCraft": ""}
        ];

	forgeApp
        .controller('MyForgeCtrl', ['$scope', function($scope){
            //avoid Angular runs dirty checking
            angular.forEach(Projects,function(){
                $scope.projects = Projects;
            });
            $scope.removeProject = function(index){
                $scope.projects.splice(index, 1);
            };
            $scope.topProjects = [
                {'name': 'Follow Me Robot', 'user': 'Greg'},
                {'name': 'Laser Tag X2', 'user': 'Rara'},
                {'name': '3D Vision Racer', 'user': 'Paul'},
                {'name': 'Acro D12', 'user': 'Nolan'},
                {'name': 'Gimbal Stabilizer', 'user': 'Adam'}
                ];
        }])

        .controller('ProjectCtrl', ['$scope', function($scope){
            //avoid Angular runs dirty checking
            angular.forEach(Projects,function(){
                $scope.projects = Projects;
            });
            $scope.addNewProject = function(){
                $scope.projects.push(
                    {"projectName" : $scope.projectName,
                     "projectType" : $scope.projectType, 
                     "projectCraft" : $scope.projectCraft});
                $scope.projectName = "";
                $scope.projectType = "";
                $scope.projectCraft = "";
            };
        }])

        ;
})();