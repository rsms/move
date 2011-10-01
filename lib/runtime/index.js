require('./runtime_string');

// Unless imported by the core module, global.__move is undefined
if (!global.__move) global.__move = {};

// Hack to provide a stub runtime object for things in the runtime lib themselves
global.Move.runtime = { _MoveKWArgsT: require('./symbols')._MoveKWArgsT };

// The actual runtime module
global.Move.runtime = require('./runtime_move');

// Load built-in preprocessors' runtime support
require('./preprocessors/ehtml');
