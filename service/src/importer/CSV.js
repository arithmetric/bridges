
var fs = require('fs');
  events = require('events');

exports.parseCSVFile = function(path, delimiter, quote, quote_escape) {
  return new Csv(path, delimiter, quote, quote_escape);
};

Csv = function(path, delimiter, quote, quote_escape) {
  this.path = path;
  this.delimiter = delimiter || ',';
  this.quote = quote || '"';
  this.quote_escape = quote_escape || '"';
  this.dataBuffer = "";
  this.parse(this);
};

Csv.prototype.__proto__ = events.EventEmitter.prototype;

Csv.prototype.parse = function(opts) {
  var stream = fs.createReadStream(opts.path);

  stream.on("data", function(data) { opts = handleData(opts, data); })
    .on("end", function() { finishData(opts); });
};

function handleData(opts, data) {
  var posLastRec,
    csvRecs = '';

  // Add data to the buffer
  opts.dataBuffer += data;

  // Check for full records
  posLastRec = opts.dataBuffer.lastIndexOf("\n");
  if (posLastRec > 0) {
    csvRecs = opts.dataBuffer.substring(0, posLastRec);
    opts.dataBuffer = opts.dataBuffer.substring(posLastRec + 1);
  }

  //
  if (csvRecs.length) {
    parseRecords(opts, csvRecs, function (err, data) {
      if (err) { throw(err); }
      opts.emit("data", data);
    });
  }
  return opts;
};

function finishData(opts) {
  opts.emit("end");
};

function parseRecords(opts, data, fn) {

    try {
        
        var d = opts.delimiter,
            e = opts.quote_escape, 
            q = opts.quote;

        var pattern = new RegExp(
        
            '('+d+'|\\r?\\n|\\r|^)' +
            '(?:'+q+'([^'+q+']*(?:'+e+q+'[^'+q+']*)*)"|' +
            '([^'+q+d+'\\r\\n]*))'
            
        , 'gi');

        var csv = [[]];

        var matches = null, strMatchedValue, matchedDelimiter;

        if (e == '\\') e = '\\\\';

        while (matches = pattern.exec(data)){

            matchedDelimiter = matches[1];

            if (matchedDelimiter.length && matchedDelimiter !== d) {
                csv.push([]);
            }
            
            if (matches[2]) {
                strMatchedValue = matches[2].replace(new RegExp(e+q, 'g'), q);
            } else {
                strMatchedValue = matches[3];
            }

            csv[csv.length - 1].push(strMatchedValue);

        }

        csv.pop();

        if (fn) {
            fn(null, csv);
        } else {
            return csv;
        }
        
    } catch (e) {
        if (fn) {
            fn(e, []);
        } else {
            throw e;
        }
    }
};
