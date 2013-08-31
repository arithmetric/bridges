
(function($) {

const bridgesLocationAccuracyFactor = 1000,
  bridgesLocationTimeout = 1000,
  bridgesDebug = 0;

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
    content: "<label>Road:</label> <strong>" + this.bridgeData.road + "</strong><br/><label>Crossing:</label> <strong>" + this.bridgeData.crossing + "</strong>",
    disableAutoPan: true
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
        $("#table-container").children().remove();
        mapRemoveMarkers();
        if (bridgesDebug) {
          $("#table-container").append("<p>Using location " + bridgesCurrentLongitude + ", " + bridgesCurrentLatitude + " in range " + bridgesCurrentRange + "</p>");
        }
        if (data.results.length) {
          $("#table-container").append('<table class="table table-striped"><thead><th>Road</th><th>Crossing</th><th></th></thead><tbody></tbody></table>');
          num = data.results.length;
          for (i = 0; i < num; i++) {
            $("#table-container tbody").append("<tr><td>" + data.results[i].road + "</td><td>" + data.results[i].crossing + "</td><td></td></tr>");
            mapAddMarker(data.results[i]);
          }
        }
        else {
          $("#table-container").append("<p>No bridges found.</p>");
        }
      }
      else {
        $("#table-container").append("<p>Something went wrong.</p>");
      }
    }
  });
}

function updatePosition() {
  navigator.geolocation.getCurrentPosition(locationSuccess, locationError, {enableHighAccuracy: true, timeout: bridgesLocationTimeout});
}

function changeRange(range) {
  disableTracking();
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
  disableTracking();
  bridgesCurrentLongitude = 0;
  bridgesCurrentLatitude = 0;
  bridgesCurrentRange = 400;
  bridgesWatchId = navigator.geolocation.watchPosition(locationSuccess, locationError, {enableHighAccuracy: true, timeout: bridgesLocationTimeout});
}

function disableTracking() {
  if (bridgesWatchId) {
    navigator.geolocation.clearWatch(bridgesWatchId);
    bridgesWatchId = 0;
  }
}

function handleNavbarAction(e) {
  var actionId = $(e.target).attr('id');
  switch(actionId) {
    case 'action-about':
      break;
    case 'action-quarter':
      $('.action-range').parent().removeClass('active');
      $('#action-quarter').parent().addClass('active');
      changeRange(400);
      break;
    case 'action-one':
      $('.action-range').parent().removeClass('active');
      $('#action-one').parent().addClass('active');
      changeRange(1600);
      break;
    case 'action-three':
      $('.action-range').parent().removeClass('active');
      $('#action-three').parent().addClass('active');
      changeRange(4800);
      break;
    case 'action-zoom-in':
      $('.action-range').parent().removeClass('active');
      $('#action-zoom-in').parent().addClass('active');
      if (bridgesCurrentRange == 1600) {
        changeRange(400);
      }
      else if (bridgesCurrentRange == 4800) {
        changeRange(1600);
      }
      break;
    case 'action-zoom-out':
      $('.action-range').parent().removeClass('active');
      $('#action-zoom-out').parent().addClass('active');
      if (bridgesCurrentRange == 400) {
        changeRange(1600);
      }
      else if (bridgesCurrentRange == 1600) {
        changeRange(4800);
      }
      break;
    case 'action-track':
      $('.action-range').parent().removeClass('active');
      $('#action-track').parent().addClass('active');
      enableTracking();
      break;
    case 'action-map':
      $('#map-container').show();
      $('#action-map').parent().addClass('active');
      $('#table-container').hide();
      $('#action-table').parent().removeClass('active');
      break;
    case 'action-table':
      $('#table-container').show();
      $('#action-table').parent().addClass('active');
      $('#map-container').hide();
      $('#action-map').parent().removeClass('active');
      break;
  }
  e.preventDefault();
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
      disableDefaultUI: true,
      disableDoubleClickZoom: true,
      draggable: false,
      keyboardShortcuts: false,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      scrollwheel: false,
      zoom: getMapZoom()
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
  $('.navbar a').click(handleNavbarAction);
  changeRange(400);
  $('#action-quarter').parent().addClass('active');
}

initialize();

})(jQuery);
