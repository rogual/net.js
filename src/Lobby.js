define(function(require) {

  return function Lobby(url) {
    var lobby = {

      poll: function(cb) {
        $.ajax({
          url: url,
          dataType: 'json',
          success: function(data) { cb(null, data); },
          error: function(err) { cb(err); }
        });
      },

      advertise: function(id, serverInfo, cb) {
        $.ajax({
          url: id ? url + '/' + id : url,
          type: 'POST',
          data: JSON.stringify(serverInfo),
          dataType: 'json',
          contentType: 'application/json',
          success: function(id) { if (cb) cb(id); },
          error: function(err) { if (cb) cb(err); }
        });
      },

      withdraw: function(id, cb) {
        $.ajax({
          url: url + '/' + id,
          type: 'DELETE',
          success: function() { cb(); },
          error: function(e) { cb(e); }
        });
      }

    };

    return lobby;
  };

});
