define(function(require) {

  var Util = require('Util');

  return function Chat(players) {

    var node = players.node;

    var chat = {};

    chat.onmessage = function(from, message) {};

    var receive = node.rpcTable.add(function(conn, from, message) {
      Util.assert(node.role == 'client' || !conn);
      chat.onmessage(from, message);
    });

    chat.send = node.rpcTable.add(function(conn, message) {
      var player = conn ? conn.player : players.local;
      node.broadcast(receive, player.id, message);
    });

    return chat;

  };

});
