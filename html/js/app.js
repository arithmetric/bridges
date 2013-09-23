
(function($) {

const bridgesLocationAccuracyFactor = 100,
  bridgesLocationTimeout = 1000,
  bridgesDebug = 0;

var bridgesWatchId = 0,
  bridgesCurrentLatitude = 0,
  bridgesCurrentLongitude = 0,
  bridgesLastDataLatitude = 0,
  bridgesLastDataLongitude = 0,
  bridgesCurrentRange = 0,
  bridgesMap = 0,
  bridgesMapMarkers = [],
  bridgesSelfMarker = 0,
  bridgesRangeCircle = 0,
  bridgesInfoWindow = 0;

function showWarning(msg) {
  var msgHash = String(msg).hashCode();
  if (!$("header.navbar .warning-" + msgHash).length) {
    $("header.navbar").append('<div class="alert warning-' + msgHash + '"><button type="button" class="close" data-dismiss="alert">&times;</button><strong>Warning!</strong> ' + msg + '</div>');
  }
}

function mapCloseInfo() {
  if (bridgesInfoWindow) {
    bridgesInfoWindow.close();
    bridgesInfoWindow = 0;
  }
}

function mapShowInfo(e) {
  mapCloseInfo();
  bridgesInfoWindow = new google.maps.InfoWindow({
    content: "<label>Road:</label> <strong>" + this.bridgeData.road + "</strong><br/><label>Crossing:</label> <strong>" + this.bridgeData.crossing + "</strong><br/><label>Year Built:</label> <strong>" + this.bridgeData.yearBuilt + "</strong>",
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
      title: item.road + ' / ' + item.crossing + " (" + item.yearBuilt + ")"
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
        centerMap();
        bridgesLastDataLatitude = bridgesCurrentLatitude;
        bridgesLastDataLongitude = bridgesCurrentLongitude;
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
  var currentLatLng = new google.maps.LatLng(bridgesCurrentLatitude, bridgesCurrentLongitude),
    newLatLng = new google.maps.LatLng(point.coords.latitude, point.coords.longitude),
    changed = (currentLatLng && newLatLng) ? google.maps.geometry.spherical.computeDistanceBetween(currentLatLng, newLatLng) > bridgesLocationAccuracyFactor : true;
  bridgesCurrentLatitude = point.coords.latitude;
  bridgesCurrentLongitude = point.coords.longitude;
  centerMap();
  if (bridgesDebug) {
    $("#results").prepend("<p>Location checked... " + (changed ? "changed" : "unchanged") + "</p>");
  }
  if (changed) {
    updateResults();
  }
}

function locationError(err) {
  if (err.code == 1) {
    showWarning("You must provide your location to find nearby bridges.");
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

function centerMap() {
  if (bridgesMap) {
    var pos = new google.maps.LatLng(bridgesCurrentLatitude, bridgesCurrentLongitude);
    bridgesSelfMarker.setPosition(pos);
    bridgesRangeCircle.setCenter(pos);
    bridgesRangeCircle.setRadius(bridgesCurrentRange);
    bridgesMap.panTo(pos);
    bridgesMap.fitBounds(bridgesRangeCircle.getBounds());
  }
  else {
    buildMap();
  }
}

function buildMap() {
  var pos = new google.maps.LatLng(bridgesCurrentLatitude, bridgesCurrentLongitude),
    mapStyles = [
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
      zoom: getMapZoom()
    },
    mapDiv = document.getElementById("map-container");
  bridgesMap = new google.maps.Map(mapDiv, mapOptions);
  bridgesSelfMarker = new google.maps.Marker({
    position: pos,
    icon: {
      origin: new google.maps.Point(168, 0),
      size: new google.maps.Size(14, 14),
      url: "/img/glyphicons-halflings.png"
    },
    clickable: false,
    map: bridgesMap
  });
  bridgesRangeCircle = new google.maps.Circle({
    strokeColor: "#ffffff",
    strokeOpacity: 0.72,
    strokeWeight: 1,
    fillColor: "#ffffff",
    fillOpacity: 0.24,
    map: bridgesMap,
    clickable: false,
    center: pos,
    radius: bridgesCurrentRange
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
}
