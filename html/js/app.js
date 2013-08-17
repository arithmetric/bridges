
(function($) {

const bridgesLocationAccuracyFactor = 1500,
  bridgesLocationTimeout = 2000,
  bridgesDebug = 1;

var bridgesWatchId = 0,
  bridgesCurrentLatitude = 0,
  bridgesCurrentLongitude = 0,
  bridgesCurrentRange = 0;

function updateResults() {
  var serviceUrl = 'http://' + window.location.hostname + ':8841/bridges?longitude=' + bridgesCurrentLongitude + '&latitude=' + bridgesCurrentLatitude + '&range=' + bridgesCurrentRange;
  $.ajax({
    dataType: "json",
    url: serviceUrl,
    success: function (data) {
      if (data.hasOwnProperty("status") && data.hasOwnProperty("results") && data.status == "ok") {
        $("#results").children().remove();
        if (bridgesDebug) {
          $("#results").append("<p>Using location " + bridgesCurrentLongitude + ", " + bridgesCurrentLatitude + " in range " + bridgesCurrentRange + "</p>");
        }
        if (data.results.length) {
          $("#results").append("<ul></ul>");
          num = data.results.length;
          for (i = 0; i < num; i++) {
            $("#results ul").append("<li>" + data.results[i].road + " / " + data.results[i].crossing + " (" + data.results[i].location + ")</li>");
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
  updatePosition();
}

function locationSuccess(point) {
  var latitude = point.coords.latitude,
    longitude = point.coords.longitude,
    changed = (Math.round(latitude * bridgesLocationAccuracyFactor) != Math.round(bridgesCurrentLatitude * bridgesLocationAccuracyFactor) && Math.round(longitude * bridgesLocationAccuracyFactor) != Math.round(bridgesCurrentLongitude * bridgesLocationAccuracyFactor)) ? 1 : 0;
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
  bridgesCurrentRange = 160;
  if (!bridgesWatchId) {
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
    case 'action-tenth':
      changeRange(160);
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

function initialize() {
  $('#actions button').click(handleModeChange);
}

initialize();

})(jQuery);
