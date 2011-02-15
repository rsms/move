// Move for web browers
window.move = (function(){

var modules = {};
var require = function require(id) {
  if (++(require.depth) > 20)
    throw new Error('Recursive module dependencies');
  id = id.replace(/^[\/.]+/g, '');
  var module = modules[id];
  if (!module)
    throw new Error('No module with id '+id);
  if (module.block) {
    var block = module.block;
    module.block = null;
    block(module.exports, require, module);
  }
  require.depth--;
  return module.exports;
};
require.depth = 0;

// %CONTENT%

return require('index');
})();
