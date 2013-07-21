var http = require('http');
var connect = require('connect');
var cors = require('connect-xcors');
var crypto = require('crypto');


var games = {};

var app = connect();

app.use(cors());
app.use(connect.json());

/*
  Each game has an ID, known only to its creator.
*/
function generateID() {
  return crypto.createHash('sha1').update('' + Math.random()).digest('hex');
}

app.use(function(req, res) {
  console.log(req.method, req.url);
  res.setHeader('content-type', 'application/json');

  /*
    GET /games -- Get list of games
  */
  if (req.method == 'GET' && req.url == '/games') {
    var list = [];
    Object.keys(games).forEach(function(id) { list.push(games[id]); });
    res.end(JSON.stringify(list));
  }

  /*
    POST /games -- Register new game
  */
  else if (req.method == 'POST' && req.url == '/games') {
    var id = req.body.id || generateID();
    var game = {
      date: Date.now(),
      ip: req.connection.remoteAddress,
      data: req.body.data
    };
    games[id] = game;

    res.end(JSON.stringify(id));
  }
  else {
    res.writeHead(403);
    res.end(JSON.stringify("bad"));
  }
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
    if (diff > 1000 * 60) // 1min
      prune.push(id);
  });
  prune.forEach(function(id) { delete games[id]; });
}, 5000);

if (require.main == module) {
  var port = process.argv[2] || 8000;
  console.log("Listening on port", port);
  app.listen(port);
}
