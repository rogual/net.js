define(function(require) {

  var Util = require('./Util');

  return function Players(node, numSlots) {

    var players = {};

    players.node = node;

    /*
      Create player slots
    */
    players.all = [];
    for (var i=0; i<numSlots; i++)
      players.all.push(null);

    /*
      User-assignable callbacks
    */
    players.onchange = function() {};

    players.authenticate = function(credentials) {
      return credentials;
    };

    players.forEach = function(cb) {
      players.all.forEach(function(player) {
        if (player) cb(player, player.id);
      });
    };

    players.onLoginError = function(msg) {};

    var clientError = node.rpcTable.add(function(conn, msg) {
      players.onLoginError(msg);
    });

    /*
      Clients call this RPC to log in and get a player object.
    */
    players.login = node.rpcTable.add(function(conn, credentials) {
      var data = players.authenticate(credentials);
      if (data) {
        var player = players.add(conn, data);
        if (player) {
          conn.player = player;
          player.connection = conn;
        }
        else {
          node.remote(conn, clientError, "Sorry, the server is full.");
        }
      }
      else {
        node.remote(conn, clientError, "login failed");
      }
    });

    players.init = function(player) {};

    /*
      The server can add/remove players. Returns null if full.
    */
    if (node.role == 'server') {
      players.add = function(connection, data) {
        for (var id=0; players.all[id]; id++);
        if (id == numSlots)
          return null;

        var player = {
          id: id,
          connection: connection,
          data: data
        };

        if (!player.connection) {
          Util.assert(!players.local);
          players.local = player;
        }

        players.all[id] = player;

        players.init(player);

        broadcastPlayers();

        return player;
      };

      players.remove = function(player) {
        players.all[player.id] = null;
        if (!player.connection)
          players.local = null;
        broadcastPlayers();
      };

      /*
        Remove any player who disconnects.
      */
      var old = node.ondisconnect;
      node.ondisconnect = function(client) {
        old(client);
        if (client.player)
          players.remove(client.player);
      };
    }

    players.show = function(conn, player) {
      return player.data;
    };

    players.see = function(conn, data) {
      return data;
    };

    players.changed = broadcastPlayers;

    /*
      broadcastPlayers sends the new player list to everyone using the
      'changed' RPC.
    */
    function broadcastPlayers() {
      node.clients.forEach(function(conn) {
        node.broadcast(
          changed,
          players.all.map(
            function(player) {
              return player ? players.show(conn, player) : null;
            }
          )
        );
      });
    }

    var changed = node.rpcTable.add(function(conn, newPlayers) {
      if (node.role == 'client') {

        for (var i=0; i<players.all.length; i++) {
          var data = players.see(conn, newPlayers[i]);
          if (data)
            if (players.all[i])
              players.all[i].data = data;
          else
            players.all[i] = {
              connection: null,
              data: data
            };
          else
            players.all[i] = null;
        }
      }
      players.onchange(players.all);
    });

    return players;

  };
});
