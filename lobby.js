var http = require('http');
var express = require('express');
var cors = require('connect-xcors');
var crypto = require('crypto');


var games = {};

var app = express();

app.use(express.logger('tiny'));
app.use(cors());
app.use(express.json());

/*
  Each game has an ID, known only to its creator.
*/
function generateID() {
  return crypto.createHash('sha1').update('' + Math.random()).digest('hex');
}

app.get('/games', function(req, res) {
  var list = [];
  Object.keys(games).forEach(function(id) { list.push(games[id]); });
  res.json(list);
});

app.post('/games', function(req, res) {
  var id = req.body.id || generateID();
  var game = {
    date: Date.now(),
    ip: req.connection.remoteAddress,
    data: req.body.data
  };
  games[id] = game;

  res.json(id);
});

app.delete('/games/:id', function(req, res) {
  var id = req.params.id;
  if (games[id]) {
    delete games[id];
    res.send(200);
  }
  else
    res.send(404);
});

/*
  Prune old games from the list
*/
setInterval(function() {
  var now = Date.now();
  var prune = [];
  Object.keys(games).forEach(function(id) {
    var game = games[id];
    var diff = now - game.date;
    if (diff > 1000 * 20)
      prune.push(id);
  });
  prune.forEach(function(id) { delete games[id]; });
}, 5000);

if (require.main == module) {
  var port = process.argv[2] || 8000;
  console.log("Listening on port", port);
  app.listen(port);
}
