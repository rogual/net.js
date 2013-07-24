define(function(require) {

  var Util = require('./Util');
  var RPCTable = require('./RPCTable');

  var peer;

  return function Node(brokerUrl, role, onReady) {

    var node = {};

    node.role = role;

    var rpcTable = node.rpcTable = RPCTable();
    var outbox = [];

    /*
      Called when a message comes in. Route it to the right RPC.
    */
    function receive(connection, channel, message) {
      rpcTable.call(connection, message.data);
    }

    /*
      Define some node methods for calling RPCs
    */
    node.remote = function(recipient, rpc) {
      var args = Util.array(arguments).slice(2);
      var msg = rpc.encode(args);
      outbox.push([recipient, msg]);
    };

    node.local = function(rpc) {
      var args = Util.array(arguments).slice(1);
      rpc.fn.apply(null, [null].concat(args));
    };

    /*
      User-assignable callbacks
    */
    node.onstatechange = function(state) {};

    /*
      Send all pending messages
    */
    node.process = function() {
      for (var i in outbox) {
        var item = outbox[i];
        var recipient = item[0];
        var msg = item[1];
        recipient.send('reliable', msg);
      }
      outbox = [];
    };

    node.close = function() {
      if (node.connection)
        node.connection.close();
    };


    /*
      Assign server-specific node properties
    */
    if (role == 'server') {

      node.server = node.local;

      node.clients = [];

      node.ondisconnect = function(client) {};

      node.broadcast = function() {
        var args = Util.array(arguments);
        node.clients.forEach(function(connection) {
          node.remote.apply(
            null,
            [connection].concat(args)
          );
        });
        node.local.apply(null, args);
      };

      node.listen = function() {
        peer.onconnection = function(connection) {

          node.clients.push(connection);

          connection.ondisconnect = function(reason) {
            node.clients.splice(node.clients.indexOf(connection), 1);
            node.ondisconnect(connection);
          };
          connection.onerror = function(error) {
            connection.close();
          };
          connection.onmessage = function(channel, message) {
            receive(connection, channel, message);
          };
        };
        peer.listen();
      };

    }

    /*
      Assign client-specific node properties
    */
    if (role == 'client') {

      node.connect = function(route, cb) {
        cb = cb || function() {};
        peer.onerror = function(error) {
          peer.onconnection = peer.onerror = null;
          cb(error);
        };
        peer.onconnection = function(connection) {
          peer.onconnection = null;

          node.connection = connection;

          connection.onmessage = function(channel, message) {
            receive(connection, channel, message);
          };

          node.server = function() {
            node.remote.apply(null, [connection].concat(Util.array(arguments)));
          };

          node.onstatechange('connected'); cb();
        };

        peer.connect(route);
      };

    }

    if (peer) {
      node.peer = peer;
      node.route = peer.route;
      onReady(node);
    }
    else {
      node.peer = peer = new Peer(brokerUrl, {video: false, audio: false});

      peer.onroute = function(route) {
        node.route = route;
        onReady(node);
      };

      peer.onerror = function(e) {
        console.error(e);
      };
    }


  };

});
