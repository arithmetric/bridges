
var MongoClient = require('mongodb').MongoClient
  , fs = require('fs')
  , async = require('async')
  , config = require('./config')
  , parser = require('./CSV')
  , mongoCollection
  , csvParser
  , csvData = '';

function loadData() {
  var i
    , num
    , csvFiles;
  fs.stat(config.csvPath, function (err, stats) {
    if (err) {
      throw(err);
    }
    else if (stats.isDirectory()) {
      fs.readdir(config.csvPath, function (err, files) {
        if (err) {
          throw(err);
        }
        else if (files && files.length) {
          csvFiles = [];
          num = files.length;
          for (i = 0; i < num; i++) {
            if (files[i].substr(-4).toLowerCase() == '.csv') {
              csvFiles.push(files[i]);
            }
          }
          async.each(csvFiles, loadCsvFile, function (err) {
            if (err) {
              console.log("Encountered error while importing CSVs: " + err);
              process.exit(1);
            }
            else {
              console.log("Finished importing all CSV files");
            }
          });
        }
      });
    }
    else if (stats.isFile()) {
      loadCsvFile(config.csvPath);
    }
    else {
      console.log("The CSV path " + config.csvPath + " is not a file or directory");
    }
  });
}

function loadCsvFile(fn, callback) {
  console.log("Parsing CSV file " + fn);
  parser.parseCSVFile(fn)
    .on("data", function(data) {
      handleData(data);
    }).on("end", function() {
      console.log("Imported data file to db records");
      callback();
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

MongoClient.connect(config.mongodbUrl, function(err, db) {
  if (err) throw err;

  mongoCollection = db.collection(config.mongodbCollection);
  console.log('Initialized db connection');

  mongoCollection.ensureIndex({"point": "2dsphere"}, {}, function () {
    console.log('Verified db indexes');
  
    loadData();
  });
});
