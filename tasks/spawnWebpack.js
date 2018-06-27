// spawn webpack in a separate process to improve overall build speed
let spawn = require('child_process').spawn;

module.exports = function() {

  return function(callback) {

    spawn('gulp', ['client:webpack'], {stdio: 'inherit'});

  };
};
