define(function(require) {

  var Lobby = require('Lobby');
  var Node = require('Node');
  var Chat = require('Chat');
  var Players = require('Players');

  /*
    We need URLs for two servers -- the lobby server for server discovery,
    and the broker server for peer-to-peer Javascript communication.
  */
  var lobbyUrl = 'http://localhost:8002/games';
  var brokerUrl = 'http://localhost:8080';

  return function() {

    // We'll use this div as our display area
    var $page = $('<div>').appendTo($('body'));

    /*
      Create a lobby object, connecting to the lobby at the given URL. Lobby
      objects can be used to discover games other people are running, and to
      advertise games we're running ourselves.
    */
    var lobby = Lobby(lobbyUrl);

    /*
      Now for our node, and the players and chat objects which extend it. We'll
      start them off at null, and assign them once we create or join a game.
    */
    var node = null;
    var chat = null;
    var players = null;

    /*
      When we call process(), queued RPCs are sent to their destinations. Most
      games do this at a rate of 10-20Hz, but in this simple example we'll
      use 5Hz.
    */
    function process() {
      if (node)
        node.process();
    }
    setInterval(process, 1000 / 5);

    /*
      This function will update our GUI to match the game state. We'll call it
      whenever the state changes, and also once at the start.
    */
    function update() {
      if(!node)
        updateLobby();
      else
        updateGame();
    }
    update();

    /*
      Our update function for when we aren't in a game. Get the list of running
      games from the lobby server and render it.
    */
    function updateLobby() {
      $page.empty();

      var $playerName = $('<input>');
      var $gameName = $('<input>');
      var $host = $('<button>').text('Host').click(host);
      var $refresh = $('<button>').text('Refresh').click(poll);
      var $games = $('<ul>');

      $page
        .append(
          $('<div>').append($('<b>').text("Player Name:")).append($playerName)
        )
        .append(
          $('<div>').append($('<b>').text("Host Game:")).append($gameName)
          .append($host)
        )
        .append($refresh)
        .append($games);


      /*
        Populate the list of games.
      */
      function poll() {
        lobby.poll(function(err, games) {
          if (err) console.error(err);
          else {
            $games.empty();
            games.forEach(function(game) {
              $games.append(
                $('<li>').append(
                  $('<a>').text(JSON.stringify(game))
                  .attr('href', '#')
                  .click(function(e) { e.preventDefault(); join(game); })
                )
              );
            });
          }
        });
      }
      poll();

      /*
        We'll need to set our game state variables (node, players, chat) when
        we host or join a game. This function exists to factor the common bits
        out of host() and join().
      */
      function createNode(role, cb) {

        /*
          Here's where we create our Node. It represents our local machine and
          its connection to the network. You generally only create one Node
          in your program.
        */
        Node(brokerUrl, role, function(aNode) {
          node = aNode;
          node.onstatechange = update;

          /*
            We're using the optional Players and Chat modules, so instantiate
            them here. Notice that Chat depends on Players.
          */
          players = Players(node, 4);
          chat = Chat(players);
          cb();
        });
      }

      /*
        To host: create a node, add a local player and listen for connections.
      */
      function host() {
        createNode('server', function() {

          var gameName = $gameName.val();
          var playerName = $playerName.val();

          players.add(null, {name: playerName});

          node.listen();
          lobby.advertise({data: {name: gameName, route: node.route}});
          updateGame();
        });
      }

      /*
        To join: create a node, connect to a host, and call players.login
      */
      function join(game) {
        createNode('client', function() {

          var playerName = $playerName.val();

          $page.text('connecting to ' +  game.data.route + '...');
          node.connect(game.data.route, function(err) {
            if (err)
              $page.text(err);
            else {
              /*
                players.login is an RPC in the players module.

                node.server() is a function in the node module which
                causes the given RPC to be called on the server.

                The other argument gets passed to the rpc when it's called on
                the server. RPCs can take any number of arguments.
              */
              node.server(players.login, {name: playerName});
            }
          });
        });
      }
    }

    /*
      Our update function for when we're in a game. Display a list of all
      players and a chat window.

      We interact with the Chat module using chat.onmessage and chat.send.
      Since chat.send is an RPC, we need to call it indirectly using one of
      the RPC callers in the Node module; in this case, node.server().
    */
    function updateGame() {
      $page.empty();
      var $players = $('<ol>');

      $page.append(
        $('<div>').append($('<b>').text('Players')).append($players)
      );

      function updatePlayers() {
        $players.empty();
        players.forEach(function(player) {
          $players.append($('<li>').text(JSON.stringify(player.data.name)));
        });
      }

      players.onchange = updatePlayers;
      updatePlayers();

      var $chatLine = $('<input>');
      var $chatLog = $('<div>');
      var $chat = $('<form>')
        .append($('<b>').text('Chat'))
        .append($chatLog)
        .append($chatLine)
        .appendTo($page);

      chat.onmessage = function(from, msg) {
        $chatLog.append(
          $('<div>').text('<' + players.all[from].data.name + '> ' + msg)
        );
      };

      $chat.submit(function(e) {
        e.preventDefault();
        var msg = $chatLine.val();
        $chatLine.val('');

        node.server(chat.send, msg);
      });
    }

  };

});
