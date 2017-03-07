var event = {};

var context = {
  succeed(result)  {
    console.log(result);
  },
  fail(err) {
    console.log(err);
  }
};

require('./database-backup').handler(event, context);