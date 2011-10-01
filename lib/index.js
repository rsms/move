global.Move = exports;
global.__move = exports; // DEPRECATED since 0.4.4. Use global.Move instead.

// Version as a string e.g. "0.2.4"
exports.version = function version() {
  if (exports.version._v === undefined)
    exports.version._v = JSON.parse(require('fs').readFileSync(__dirname+'/../package.json', 'utf8')).version;
  return exports.version._v;
}

require('./compiler');  // includes the runtime library, but not the cli library
