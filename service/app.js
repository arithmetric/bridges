
var restify = require('restify')
  , MongoClient = require('mongodb').MongoClient
  , config = require('./config')
  , mongoCollection
  , server;

server = restify.createServer({
  name: 'bridges-service',
  version: '0.1.0'
});
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
//server.use(restify.bodyParser());

MongoClient.connect(config.mongodbUrl, function(err, db) {
  if (err) throw err;

  mongoCollection = db.collection(config.mongodbCollection);
  console.log('Initialized db');
});

server.opts('/.*/', function (req, res, next) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.send({"status": "ok"});
  return next();
});

server.get('/bridges', function (req, res, next) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.params.hasOwnProperty('lon') && req.params.hasOwnProperty('lat') && req.params.hasOwnProperty('range')) {
    var lon = parseFloat(req.params.lon),
      lat = parseFloat(req.params.lat),
      range = parseInt(req.params.range),
      criteria = {
        "point": {
          "$near": {
            "$geometry": {
              "type": "Point",
              "coordinates": [lon, lat]
            },
            "$maxDistance": parseInt(req.params.range)
          }
        }
      },
      projection = {
        "crossing": true,
        "road": true,
        "point": true,
        "yearBuilt": true
      };
    if (range > 0 && range < 10000 && lon > -180 && lon < 180 && lat > -90 && lat < 90) {
      mongoCollection.find(criteria, projection).toArray(function(err, results) {
        console.log("criteria:", criteria.point["$near"]["$geometry"], "err: ", err, "results:", results);
        if (err || !results) {
          res.send({"status": "error", "message": "query failed"});
        }
        else {
          res.send({"status": "ok", "results": results});
        }
        return next();
      });
    }
    else {
      res.send({"status": "error", "message": "invalid parameters"});
      return next();
    }
  }
  else {
    res.send({"status": "error", "message": "invalid request"});
    return next();
  }
});

/*
server.get('/bridges/:id', function (req, res, next) {
  res.send(req.params);
  return next();
});
*/

server.listen(config.servicePort, function () {
  console.log('%s listening at %s', server.name, server.url);
});
