var event = {};

var context = {
  succeed: function(result) {
    console.log(result);
  },
  fail: function(err) {
    console.log(err);
  }
};

require('./backup').handler(event, context);