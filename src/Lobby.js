define(function(require) {

  return function Lobby(url) {
    return {

      poll: function(cb) {
        $.ajax({
          url: url,
          dataType: 'json',
          success: function(data) { cb(null, data); },
          error: function(err) { cb(err); }
        });
      },

      advertise: function(serverInfo, cb) {
        $.ajax({
          url: url,
          type: 'POST',
          data: JSON.stringify(serverInfo),
          contentType: 'application/json',
          success: function() { if (cb) cb(); },
          error: function(err) { if (cb) cb(err); }
        });
      },

    };
  };

});
