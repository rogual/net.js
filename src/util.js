define(function(require) {

  var Util = {};

  Util.array = function(xs) {
    return Array.prototype.slice.call(xs);
  };

  Util.assert = function(x, msg) {
    if (!x) console.error(msg || 'assertion failed');
  };

  /*
    dot('b', 'c')(a) = a.b.c
  */
  Util.dot = function() {
    var args = Util.array(arguments);
    return function(o) {
      for (var i=0; i<args.length; i++) {
        o = o[args[i]];
      }
      return o;
    };
  };

  return Util;

});
