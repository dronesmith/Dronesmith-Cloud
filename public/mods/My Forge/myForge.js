(function() {
    'use strict';
    var Projects = [
        {"projectName" : "project one", "projectType" : "", "projectCraft": ""}
        ];

	forgeApp
        .controller('MyForgeCtrl', ['$scope', 'Session', function($scope, Session) {

          Session
            .get({}, function(data) {
              $scope.userInfo = data.userData || null;

              $scope.userInfo.points = 13959;
              $scope.userInfo.merits = [
                {img: 'mods/My Forge/merits/cutesmith.png'},
                {img: 'mods/My Forge/merits/dronesmith1.png'},
                {img: 'mods/My Forge/merits/dronesmith2.png'},
                {img: 'mods/My Forge/merits/rockstarapp1.png'},
                {img: 'mods/My Forge/merits/helper1.png'},
                {img: 'mods/My Forge/merits/helper2.png'},
                {img: 'mods/My Forge/merits/helper3.png'},
                {img: 'mods/My Forge/merits/helper4.png'}
              ];

              $scope.userInfo.appSpace = 11;
              $scope.userInfo.tutorialSpace = 4;
              $scope.userInfo.modSpace = 32;

              $scope.apps = [
                {name: 'Drone Wars', desc: 'An augment of W0LVERT0N\'s laser tag app. Now includes an interactive augmented reality mod!'},
                {name: 'MyFirstApp', desc: 'Congrats! You made your first Eedu app!'}

              ];

              $scope.tutorials = [
                {name: 'Indoor auto-flight for dummies', desc: 'This tutorial will show you how to make a simple indoor flight app!'},
                {name: 'Drone Music 101', desc: 'Make Eedu dance a sweet jig!'}
              ];

            });

            //avoid Angular runs dirty checking
            angular.forEach(Projects,function(){
                $scope.projects = Projects;
            });
            $scope.removeProject = function(index){
                $scope.projects.splice(index, 1);
            };
            $scope.feed = [
                {
                  type: 'app',
                  name: 'Acro D12',
                  user: 'GregTheGreat',
                  userurl: 'http://discuss.dronesmith.io/users/gregthegreat/activity',
                  desc: 'Andrew Carnegie once said, steel is the backbone of American industry.'
                },
                {
                  type: 'topic',
                  name: 'Can\'t get this thing to follow my dog!',
                  user: 'RaraOnYoCouch',
                  userurl: 'http://discuss.dronesmith.io/users/rara/activity'
                },
                {
                  type: 'app',
                  name: 'Laser Tag',
                  user: 'W0LVERT0N',
                  userurl: 'http://discuss.dronesmith.io/users/w0lvertr0n/activity',
                  desc: 'Laser Tag is an intuitive PvP Eedu app that lets you take your FPV skills to the limit!'
                },
                {
                  type: 'help',
                  user: 'Nolando',
                  desc: 'I need somone to help me implement a bubble blower device into my Eedu, for science'
                },
                {
                  type: 'tutorial',
                  user: 'jinger26',
                  desc: 'How to create a nyan Eedu!',
                  userurl: 'http://discuss.dronesmith.io/users/jinger/activity'
                },
                {
                  type: 'topic',
                  name: 'What\'s your favorite app?',
                  desc: 'just wondering what everybody\'s favorite app is, mine personally is',
                  user: 'amanda',
                  userurl: 'http://discuss.dronesmith.io/users/acuencaso/activity'
                }
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
