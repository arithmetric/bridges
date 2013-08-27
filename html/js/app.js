
(function($) {

const bridgesLocationAccuracyFactor = 1000,
  bridgesLocationTimeout = 1000,
  bridgesDebug = 1;

var bridgesWatchId = 0,
  bridgesCurrentLatitude = 0,
  bridgesCurrentLongitude = 0,
  bridgesCurrentRange = 0,
  bridgesMap = 0,
  bridgesMapMarkers = [],
  bridgesSelfMarker = 0,
  bridgesInfoWindow = 0;

function mapCloseInfo() {
  if (bridgesInfoWindow) {
    bridgesInfoWindow.close();
    bridgesInfoWindow = 0;
  }
}

function mapShowInfo(e) {
  mapCloseInfo();
  bridgesInfoWindow = new google.maps.InfoWindow({
    content: this.bridgeData.road + ' / ' + this.bridgeData.crossing
  });
  bridgesInfoWindow.open(bridgesMap, this);
}

function mapRemoveMarkers() {
  if (bridgesMapMarkers) {
    for (i in bridgesMapMarkers) {
      bridgesMapMarkers[i].setMap(null);
    }
  }
}

function mapAddMarker(item) {
  if (item.point && item.point.coordinates && item.point.coordinates.length == 2) {
    var marker = new google.maps.Marker({
      position: new google.maps.LatLng(item.point.coordinates[1], item.point.coordinates[0]),
      animation: google.maps.Animation.DROP,
      map: bridgesMap,
      title: item.road + ' / ' + item.crossing
    });
    marker.bridgeData = item;
    google.maps.event.addListener(marker, 'click', mapShowInfo);
    bridgesMapMarkers.push(marker);
  }
}

function updateResults() {
  var serviceUrl = 'http://' + window.location.hostname + ':8841/bridges?lon=' + bridgesCurrentLongitude + '&lat=' + bridgesCurrentLatitude + '&range=' + bridgesCurrentRange;
  $.ajax({
    dataType: "json",
    url: serviceUrl,
    success: function (data) {
      if (data.hasOwnProperty("status") && data.hasOwnProperty("results") && data.status == "ok") {
        $("#results").children().remove();
        mapRemoveMarkers();
        if (bridgesDebug) {
          $("#results").append("<p>Using location " + bridgesCurrentLongitude + ", " + bridgesCurrentLatitude + " in range " + bridgesCurrentRange + "</p>");
        }
        if (data.results.length) {
          $("#results").append("<ul></ul>");
          num = data.results.length;
          for (i = 0; i < num; i++) {
            $("#results ul").append("<li>" + data.results[i].road + " / " + data.results[i].crossing + "</li>");// " (" + data.results[i].location + ")</li>");
            mapAddMarker(data.results[i]);
          }
        }
        else {
          $("#results").append("<p>No bridges found.</p>");
        }
      }
      else {
        $("#results").append("<p>Something went wrong.</p>");
      }
    }
  });
}

function updatePosition() {
  navigator.geolocation.getCurrentPosition(locationSuccess, locationError, {enableHighAccuracy: true, timeout: bridgesLocationTimeout});
}

function changeRange(range) {
  bridgesCurrentLongitude = 0;
  bridgesCurrentLatitude = 0;
  bridgesCurrentRange = range;
  updatePosition();
}

function locationSuccess(point) {
  var latitude = point.coords.latitude,
    longitude = point.coords.longitude,
    changed = (Math.round(latitude * bridgesLocationAccuracyFactor) != Math.round(bridgesCurrentLatitude * bridgesLocationAccuracyFactor) && Math.round(longitude * bridgesLocationAccuracyFactor) != Math.round(bridgesCurrentLongitude * bridgesLocationAccuracyFactor)) ? 1 : 0;
  centerMap(latitude, longitude);
  if (bridgesDebug) {
    $("#results").prepend("<p>Location checked... " + (changed ? "changed" : "unchanged") + "</p>");
  }
  if (changed) {
    bridgesCurrentLatitude = latitude;
    bridgesCurrentLongitude = longitude;
    updateResults();
  }
}

function locationError(err) {
  if (err.code == 1) {
    alert('perm denied');
    // user said no!
  }
}

function enableTracking() {
  if (!bridgesWatchId) {
    bridgesCurrentLongitude = 0;
    bridgesCurrentLatitude = 0;
    bridgesCurrentRange = 400;
    bridgesWatchId = navigator.geolocation.watchPosition(locationSuccess, locationError, {enableHighAccuracy: true, timeout: bridgesLocationTimeout});
  }
}

function disableTracking() {
  if (bridgesWatchId) {
    navigator.geolocation.clearWatch(bridgesWatchId);
    bridgesWatchId = 0;
  }
}

function handleModeChange(e) {
  disableTracking();
  var modeId = $(e.target).attr('id');
  switch(modeId) {
    case 'action-quarter':
      changeRange(400);
      break;
    case 'action-one':
      changeRange(1600);
      break;
    case 'action-three':
      changeRange(4800);
      break;
    case 'action-track':
      enableTracking();
      break;
  }
}

function getMapZoom() {
  var mapZoom = 14;
  if (bridgesCurrentRange < 800) {
    mapZoom = 15;
  }
  else if (bridgesCurrentRange > 3200) {
    mapZoom = 12;
  }
  return mapZoom;
}

function centerMap(lat, lon) {
  if (bridgesMap) {
    var pos = new google.maps.LatLng(lat, lon);
    bridgesMap.panTo(pos);
    bridgesMap.setZoom(getMapZoom());
    bridgesSelfMarker.setPosition(pos);
  }
  else {
    buildMap(lat, lon);
  }
}

function buildMap(lat, lon) {
  var pos = new google.maps.LatLng(lat, lon),
    mapOptions = {
      center: pos,
      draggable: false,
      zoom: getMapZoom(),
      mapTypeId: google.maps.MapTypeId.HYBRID
    },
    mapDiv = document.getElementById("map-container");
  bridgesMap = new google.maps.Map(mapDiv, mapOptions);
  bridgesSelfMarker = new google.maps.Marker({
    position: pos,
    map: bridgesMap
  });
  google.maps.event.addListener(bridgesMap, 'click', mapCloseInfo);
}

function initialize() {
  $('#actions button').click(handleModeChange);
}

initialize();

})(jQuery);
