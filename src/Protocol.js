define(function(require) {

  return {

    encode: function(x) { return JSON.stringify(x); },
    decode: function(x) { return JSON.parse(x); }

  };

});
