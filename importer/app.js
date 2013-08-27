
var MongoClient = require('mongodb').MongoClient
  , parser = require('./CSV')
  , mongoCollection
  , csvParser
  , csvData = '';

function loadData() {
  parser.parseCSVFile('./test.csv')
    .on("data", function(data) {
      handleData(data);
    }).on("end", function() {
      console.log("end");
      process.exit();
    });
}

function handleData(data) {
  var len = data.length
    , i
    , item
    , itemLonInt
    , itemLatInt
    , itemLon
    , itemLat
    , bridgeCrossing
    , bridgeRoad
    , bridgeLocation
    , record;

  for (i = 0; i < len; i++) {
    item = data[i];
    record = {};

    // Parse and normalize longitude and latitude
    itemLonInt = parseInt(item[20], 10);
    itemLatInt = parseInt(item[19], 10);
    itemLon = -1 * parseFloat(Number(String(itemLonInt).substring(0, 2)) + Number((String(itemLonInt).substring(2, 4) / 60)) + Number((String(itemLonInt).substring(4, 8) / 366000)));
    itemLat = parseFloat(Number(String(itemLatInt).substring(0, 2)) + Number((String(itemLatInt).substring(2, 4) / 60)) + Number((String(itemLatInt).substring(4, 8) / 366000)));
    if (isNaN(itemLon)) {
      console.log("Invalid longitude value for bridge " + item[1]);
      continue;
    }
    if (isNaN(itemLat)) {
      console.log("Invalid latitude value for bridge " + item[1]);
      continue;
    }
    record.point = {
      "type": "Point",
      "coordinates": [itemLon, itemLat]
    };

    // Clean the content strings
    record.crossing = cleanDataString(item[10]);
    record.road = cleanDataString(item[12]);
    record.location = cleanDataString(item[13]);

    writeRecord(record);
  }
  console.log('Finished writing ' + len + ' data records');
}

function writeRecord(item) {
  mongoCollection.insert(item, function(err, docs) {
    if (err) { throw(err); }
  });
}

function cleanDataString(str) {
  return String(str).replace(/(^' *)|( *'$)/g, "").replace(/  /g, " ");
}

MongoClient.connect('mongodb://127.0.0.1:27017/test', function(err, db) {
  if (err) throw err;

  mongoCollection = db.collection('bridges');
  console.log('Initialized db');
  loadData();
});
