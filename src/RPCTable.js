define(function(require) {

  var Protocol = require('./Protocol');
  var Util = require('./Util');

  return function RPCTable() {

    var tab = {};

    var rpcs = {};

    var nextId = 0;

    /*
      Register a function to be callable as an RPC. Returns rpc where
      rpc.encode(...) returns a network message that can be given to
      rpcs.call() to call the RPC on the remote machine.
    */
    rpcs.add = function(fn) {
      var id = nextId++;
      var rpc = tab[id] = {
        fn: fn,
        encode: function(args) {
          return Protocol.encode([id].concat(args));
        }
      };
      return rpc;
    };

    /*
      Decode an RPC call from a network message and execute it.
    */
    rpcs.call = function(connection, msg) {
      var xs = Protocol.decode(msg);
      var id = xs[0];
      var args = xs.slice(1);
      var fn = tab[id].fn;
      fn.apply(fn, [connection].concat(args));
    };

    return rpcs;

  };

});
