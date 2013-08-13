
(function($) {

var bridgesTrackTimer = 0,
  bridgesCurrentLatitude = 0,
  bridgesCurrentLongitude = 0,
  bridgesCurrentRange = 0;

function updateResults(range, fn) {
  var serviceUrl;
  bridgesCurrentRange = range;
  serviceUrl = 'http://' + window.location.hostname + ':8841/bridges?longitude=' + bridgesCurrentLongitude + '&latitude=' + bridgesCurrentLatitude + '&range=' + bridgesCurrentRange;
  $.ajax({
    dataType: "json",
    url: serviceUrl,
    success: function (data) {
//      alert('got data: ' + JSON.stringify(data));
      if (data.hasOwnProperty("status") && data.hasOwnProperty("results") && data.status == "ok") {
        $("#results").children().remove();
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
      if (fn) {
        fn();
      }
    }
  });
}

function updatePosition(fn) {
  navigator.geolocation.getCurrentPosition(function (point) {
    var latitude = point.coords.latitude,
      longitude = point.coords.longitude,
      changed = (Math.round(latitude * 1000) != Math.round(bridgesCurrentLatitude * 1000) && Math.round(longitude * 1000) != Math.round(bridgesCurrentLongitude * 1000)) ? 1 : 0;
    bridgesCurrentLatitude = latitude;
    bridgesCurrentLongitude = longitude;
    if (fn) {
      fn(changed);
    }
  }, function (err) {
    if (err.code == 1) {
      alert('perm denied');
      // user said no!
    }
    if (fn) {
      fn(0);
    }
  });
}

function updateBridges(range, fn) {
  updatePosition(function (changed) {
    if (changed || (range != bridgesCurrentRange)) {
      updateResults(range, function () {
        if (fn) {
          fn();
        }
      });
    }
    else {
      if (fn) {
        fn();
      }
    }
  });
}

function enableTracking() {
  disableTracking();
  updateBridges(160, function () {
    bridgesTrackTimer = setTimeout(enableTracking, 5000);
  });
}

function disableTracking() {
  if (bridgesTrackTimer) {
    clearTimeout(bridgesTrackTimer);
    bridgesTrackTimer = 0;
  }
}

function handleModeChange(e) {
  disableTracking();
  var modeId = $(e.target).attr('id');
  switch(modeId) {
    case 'action-tenth':
      updateBridges(160);
      break;
    case 'action-one':
      updateBridges(1600);
      break;
    case 'action-three':
      updateBridges(4800);
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
