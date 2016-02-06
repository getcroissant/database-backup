var event = {};

var context = {
  succeed: function(result) {
    console.log(result);
  },
  fail: function(err) {
    console.log(err);
  }
};

require('./database-backup').handler(event, context);