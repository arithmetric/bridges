
var BridgesMap = angular.module("BridgesMap", []);

BridgesMap.config(["$httpProvider", function($httpProvider) {
  $httpProvider.defaults.useXDomain = true;
  delete $httpProvider.defaults.headers.common["X-Requested-With"];
}]);

/**
 * Controller for the Bridges map application.
 */
function BridgesMapCtrl($scope, $http) {
  $scope.bridges = [];
  $scope.currentLocation = {"lon": 0, "lat": 0};
  $scope.dataUpdateSensitivity = 0.001;
  $scope.display = "table";
  $scope.infoWindow = 0;
  $scope.infoWindowBridge = 0;
  $scope.lastDataLocation = {"lon": 0, "lat": 0},
  $scope.lastDataRange = 0;
  $scope.map = 0;
  $scope.mapMarkers = [];
  $scope.messages = {};
  $scope.positionTimeout = 1000;
  $scope.rangeCircle = 0;
  $scope.rangeOption = 1;
  $scope.rangeOptions = [400, 800, 1600, 3200, 4800];
  $scope.rangeOptionsText = ["1/4 mile", "1/2 mile", "1 mile", "2 miles", "3 miles"];
  $scope.range = $scope.rangeOptions[$scope.rangeOption];
  $scope.rangeText = $scope.rangeOptionsText[$scope.rangeOption];
  $scope.selfMarker = 0;
  $scope.watchPositionId = 0;

  // From: http://stackoverflow.com/questions/14838184/error-digest-already-in-progress
  $scope.safeApply = function () {
    this.$$phase || this.$root.$$phase || this.$apply();
  }

  $scope.showMessage = function (msg, code) {
    var msgHash = String(msg).hashCode();
    if (!$scope.messages.hasOwnProperty(msgHash)) {
      $scope.messages["msg" + msgHash] = {"message": msg, "code": code};
      $scope.safeApply();
    }
  };

  $scope.getLocation = function () {
    function locationSuccess(point) {
      $scope.currentLocation = {"lon": point.coords.longitude, "lat": point.coords.latitude};
      $scope.safeApply();
    }

    function locationError(err) {
      if (err.code == 1) {
        $scope.showMessage("You must provide your location to find nearby bridges.", "warning");
      }
    }

    if ($scope.watchPositionId) {
      navigator.geolocation.clearWatch($scope.watchPositionId);
    }
    $scope.watchPositionId = navigator.geolocation.watchPosition(locationSuccess, locationError, {enableHighAccuracy: true, timeout: $scope.positionTimeout});
  };

  $scope.updateData = function () {
    if ($scope.currentLocation.lon == 0 || $scope.currentLocation.lat == 0 || $scope.range == 0) {
      return;
    }
    if ($scope.range <= $scope.lastDataRange && Math.sqrt(Math.pow($scope.currentLocation.lon - $scope.lastDataLocation.lon, 2) + Math.pow($scope.currentLocation.lat - $scope.lastDataLocation.lat, 2)) < $scope.dataUpdateSensitivity) {
      return;
    }
    var serviceUrl = "//" + bridgesConfig.hostname + ":" + bridgesConfig.port + "/bridges?lon=" + $scope.currentLocation.lon + "&lat=" + $scope.currentLocation.lat + "&range=" + $scope.range;
    $http.get(serviceUrl).success(function(data) {
      if (data.hasOwnProperty("status") && data.hasOwnProperty("results") && data.status == "ok") {
        $scope.bridges = data.results;
        $scope.lastDataLocation = $scope.currentLocation;
        $scope.lastDataRange = $scope.range;
      }
    });
  };

  $scope.closeInfoWindow = function () {
    if ($scope.infoWindow) {
      $scope.infoWindow.close();
      $scope.infoWindow = 0;
    }
  };

  $scope.showInfoWindow = function () {
    $scope.closeInfoWindow();
    $scope.infoWindowBridge = this.bridge;
    $scope.safeApply();
    $scope.infoWindow = new google.maps.InfoWindow({
      content: jQuery("#map-info-window").html(),
      disableAutoPan: true
    });
    $scope.infoWindow.open($scope.map, this);
  };

  $scope.removeMarkers = function () {
    if ($scope.mapMarkers) {
      for (i in $scope.mapMarkers) {
        $scope.mapMarkers[i].setMap(null);
      }
    }
  };

  $scope.addMarker = function (item) {
    if (item.point && item.point.coordinates && item.point.coordinates.length == 2) {
      var marker = new google.maps.Marker({
        position: new google.maps.LatLng(item.point.coordinates[1], item.point.coordinates[0]),
        animation: google.maps.Animation.DROP,
        map: $scope.map,
        title: item.road + " / " + item.crossing + " (" + item.yearBuilt + ")"
      });
      marker.bridge = item;
      google.maps.event.addListener(marker, "click", $scope.showInfoWindow);
      $scope.mapMarkers.push(marker);
      return marker;
    }
  };

  $scope.updateMapData = function () {
    var i = 0,
      len = $scope.bridges.length,
      bridge;
    for (; i < len; i++) {
      bridge = $scope.bridges[i];
      if (!bridge.hasOwnProperty("marker") || !bridge.marker) {
        bridge.marker = $scope.addMarker(bridge);
      }
    }
  };

  $scope.zoomIn = function () {
    if ($scope.rangeOption) {
      $scope.rangeOption--;
      $scope.range = $scope.rangeOptions[$scope.rangeOption];
      $scope.rangeText = $scope.rangeOptionsText[$scope.rangeOption];
    }
  };

  $scope.zoomOut = function () {
    if ($scope.rangeOption < ($scope.rangeOptions.length - 1)) {
      $scope.rangeOption++;
      $scope.range = $scope.rangeOptions[$scope.rangeOption];
      $scope.rangeText = $scope.rangeOptionsText[$scope.rangeOption];
    }
  };

  $scope.setRange = function (range) {
    var option = $scope.rangeOptions.indexOf(range);
    if (option >= 0 && option < $scope.rangeOptions.length) {
      $scope.rangeOption = option;
      $scope.range = $scope.rangeOptions[$scope.rangeOption];
      $scope.rangeText = $scope.rangeOptionsText[$scope.rangeOption];
    }
  };

  $scope.updateMap = function () {
    var pos = new google.maps.LatLng($scope.currentLocation.lat, $scope.currentLocation.lon);
    if ($scope.map) {
      google.maps.event.trigger($scope.map, 'resize');
      $scope.selfMarker.setPosition(pos);
      $scope.rangeCircle.setCenter(pos);
      $scope.rangeCircle.setRadius($scope.range);
      $scope.map.panTo(pos);
      $scope.map.fitBounds($scope.rangeCircle.getBounds());
    }
    else {
      var mapStyles =
        [
          {
            "featureType": "poi.business",
            "elementType": "geometry",
            "stylers": [
              { "visibility": "on" }
            ]
          },{
            "featureType": "poi.place_of_worship",
            "elementType": "geometry",
            "stylers": [
              { "visibility": "off" }
            ]
          },{
            "featureType": "poi.school",
            "elementType": "geometry",
            "stylers": [
              { "visibility": "off" }
            ]
          },{
            "featureType": "poi.sports_complex",
            "elementType": "geometry",
            "stylers": [
              { "visibility": "off" }
            ]
          },{
            "featureType": "poi.government",
            "elementType": "geometry",
            "stylers": [
              { "visibility": "off" }
            ]
          },{
            "featureType": "administrative",
            "stylers": [
              { "visibility": "off" }
            ]
          },{
            "featureType": "poi",
            "elementType": "labels",
            "stylers": [
              { "visibility": "off" }
            ]
          },{
            "featureType": "poi.medical",
            "elementType": "geometry",
            "stylers": [
              { "visibility": "off" }
            ]
          },{
            "featureType": "transit.station",
            "elementType": "labels",
            "stylers": [
              { "visibility": "off" }
            ]
          },{
            "featureType": "landscape",
            "elementType": "labels",
            "stylers": [
              { "visibility": "off" }
            ]
          }
        ],
        mapOptions = {
          center: pos,
          disableDefaultUI: true,
          disableDoubleClickZoom: true,
          draggable: false,
          keyboardShortcuts: false,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          scrollwheel: false,
          styles: mapStyles,
          zoom: 14
        },
        mapDiv = document.getElementById("map-container");
      $scope.map = new google.maps.Map(mapDiv, mapOptions);
      $scope.selfMarker = new google.maps.Marker({
        position: pos,
        icon: {
          origin: new google.maps.Point(168, 0),
          size: new google.maps.Size(14, 14),
          url: "/img/glyphicons-halflings.png"
        },
        clickable: false,
        map: $scope.map
      });
      $scope.rangeCircle = new google.maps.Circle({
        strokeColor: "#ffffff",
        strokeOpacity: 0.72,
        strokeWeight: 1,
        fillColor: "#ffffff",
        fillOpacity: 0.24,
        map: $scope.map,
        clickable: false,
        center: pos,
        radius: $scope.range
      });
      google.maps.event.addListener($scope.map, "click", $scope.closeInfoWindow);
      $scope.display = "map";
    }
  };

  $scope.$watch("bridges", function () {
    $scope.removeMarkers();
    $scope.updateMapData();
  });

  $scope.$watch("currentLocation", function () {
    $scope.updateMap();
    $scope.updateData();
  });

  $scope.$watch("range", function () {
    $scope.updateMap();
    $scope.updateData();
  });

  $scope.$watch("display", function () {
    if ($scope.display === "map") {
      jQuery("#map-container").removeClass("hideMap");
      jQuery("#displayOptionMap").addClass("active");
      jQuery("#displayOptionList").removeClass("active");
      jQuery("#displayOptionAbout").removeClass("active");
    }
    else if ($scope.display === "table") {
      jQuery("#map-container").addClass("hideMap");
      jQuery("#displayOptionList").addClass("active");
      jQuery("#displayOptionMap").removeClass("active");
      jQuery("#displayOptionAbout").removeClass("active");
    }
    else if ($scope.display === "about") {
      jQuery("#map-container").addClass("hideMap");
      jQuery("#displayOptionAbout").addClass("active");
      jQuery("#displayOptionList").removeClass("active");
      jQuery("#displayOptionMap").removeClass("active");
    }
  });

  jQuery(window).resize(function () {
    $scope.updateMap();
  });

  $scope.getLocation();
};

// From: http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
String.prototype.hashCode = function() {
  var hash = 0, chr;
  if (this.length == 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr = this.charCodeAt(i);
    hash = ((hash<<5)-hash)+chr;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
};
