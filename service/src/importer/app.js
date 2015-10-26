
var MongoClient = require('mongodb').MongoClient
  , fs = require('fs')
  , async = require('async')
  , config = require('../config')
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
      process.exit(1);
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
            if (files[i].substr(-4).toLowerCase() == ".csv") {
              csvFiles.push(config.csvPath + "/" + files[i]);
            }
          }
          console.log("Importing bridge data CSV files: " + csvFiles.join(", "));
          async.each(csvFiles, loadCsvFile, function (err) {
            if (err) {
              console.log("Encountered error while importing CSVs: " + err);
              process.exit(1);
            }
            else {
              console.log("Finished importing all CSV files");
              process.exit(0);
            }
          });
        }
      });
    }
    else if (stats.isFile()) {
      loadCsvFile(config.csvPath, function () {
        console.log("Finished importing CSV file");
        process.exit(0);
      });
    }
    else {
      console.log("The CSV path " + config.csvPath + " is not a file or directory");
      process.exit(1);
    }
  });
}

function loadCsvFile(fn, callback) {
  console.log("Parsing CSV file " + fn);
  var allItemsQueued = false,
    queue = async.queue(handleData, 13);

  queue.drain = function () {
    if (allItemsQueued) {
      callback();
    }
  };

  parser.parseCSVFile(fn)
    .on("data", function(data) {
      queue.push([data]);
    }).on("end", function() {
      console.log("Imported data file to db records");
      allItemsQueued = true;
    });
}

function handleData(data, callback) {
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

  async.each(data, function (item, cb) {
    record = {};

    // Parse and normalize longitude and latitude
    itemLonInt = String(item[20]);
    itemLatInt = String(item[19]);
    itemLon = -1 * parseFloat(Number(itemLonInt.substr(0, 3)) + Number((itemLonInt.substr(3, 2) / 60)) + Number((itemLonInt.substr(5, 4) / 366000)));
    itemLat = parseFloat(Number(itemLatInt.substr(0, 2)) + Number((itemLatInt.substr(2, 2) / 60)) + Number((itemLatInt.substr(4, 4) / 366000)));
    if (isNaN(itemLon) || itemLon < -180 || itemLon > 180) {
      console.log("Invalid longitude value for bridge " + item[1]);
      return cb();
    }
    if (isNaN(itemLat) || itemLat < -90 || itemLat > 90) {
      console.log("Invalid latitude value for bridge " + item[1]);
      return cb();
    }
    record.point = {
      "type": "Point",
      "coordinates": [itemLon, itemLat]
    };

    // Clean the content strings
    record.crossing = cleanDataString(item[10]);
    record.road = cleanDataString(item[12]);
    record.location = cleanDataString(item[13]);
    record.yearBuilt = cleanDataString(item[26]);
    record.adt = cleanDataString(item[29]);
    record.adtYear = cleanDataString(item[30]);
    record.length = cleanDataString(item[55]);
    record.yearRebuilt = cleanDataString(item[105]);
    record.sufficiency = cleanDataString(item[132]);

    writeRecord(record, cb);
  }, function (err, results) {
    console.log('Finished writing ' + len + ' data records');
    callback();
  });
}

function writeRecord(item, cb) {
  mongoCollection.insert(item, function(err, docs) {
    if (err) { throw(err); }
    return cb();
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
