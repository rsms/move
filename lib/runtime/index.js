require('./runtime_object');
require('./runtime_string');

// Unless imported by the core module, global.Move is undefined
if (!global.Move) global.Move = {};

// Hack to provide a stub runtime object for things in the runtime lib themselves
global.Move.runtime = {
  _MoveKWArgsT: require('./symbols')._MoveKWArgsT,
  dprinter: function(){return function(){};}
};

// The actual runtime module
global.Move.runtime = require('./runtime_move');

// Load built-in preprocessors' runtime support
require('./preprocessors/ehtml');
