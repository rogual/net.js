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


    /*
      Clients call this RPC to log in and get a player object.
    */
    players.login = node.rpcTable.add(function(conn, credentials) {
      var data = players.authenticate(credentials);
      if (data) {
        var player = players.add(conn, data);
        conn.player = player;
      }
      else
        conn.close();
    });

    /*
      The server can add/remove players.
    */
    if (node.role == 'server') {
      players.add = function(connection, data) {
        for (var id=0; players.all[id]; id++);

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

    /*
      broadcastPlayers sends the new player list to everyone using the
      'changed' RPC.
    */
    function broadcastPlayers() {
      node.broadcast(
        changed,
        players.all.map(
          function(player) { return player ? player.data : null; }
        )
      );
    }
    var changed = node.rpcTable.add(function(conn, newPlayers) {
      if (node.role == 'client') {
        players.all = newPlayers.map(function(data) {
          return data ? {
            connection: null,
            data: data
          } : null;
        });
      }
      players.onchange(players.all);
    });

    return players;

  };
});
