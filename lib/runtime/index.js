require('./runtime_string');

// Unless imported by the core module, global.__move is undefined
if (!global.__move) global.__move = {};

// Hack to provide a stub runtime object for things in the runtime lib themselves
global.__move.runtime = { _MoveKWArgsT: require('./symbols')._MoveKWArgsT };

// The actual runtime module
global.__move.runtime = require('./runtime_move');
