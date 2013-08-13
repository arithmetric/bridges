
var restify = require('restify');
var MongoClient = require('mongodb').MongoClient
  , mongoCollection
  , server;

server = restify.createServer({
  name: 'bridges-service',
  version: '0.0.1'
});
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
//server.use(restify.bodyParser());

MongoClient.connect('mongodb://127.0.0.1:27017/test', function(err, db) {
  if (err) throw err;

  mongoCollection = db.collection('bridges');
  console.log('Initialized db');
});


server.get('/bridges', function (req, res, next) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.params.hasOwnProperty('longitude') && req.params.hasOwnProperty('latitude') && req.params.hasOwnProperty('range')) {
    query = {
      "point": {
        "$near": {
          "$geometry": {
            "type": "Point",
            "coordinates": [parseFloat(req.params.longitude), parseFloat(req.params.latitude)]
          },
          "$maxDistance": parseInt(req.params.range)
        }
      }
    };
    mongoCollection.find(query).toArray(function(err, results) {
      res.send({"status": "ok", "results": results});
      return next();
    });
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

server.listen(8841, function () {
  console.log('%s listening at %s', server.name, server.url);
});
