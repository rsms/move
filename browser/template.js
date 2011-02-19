// Move for web browers
window.move = (function(){

if (typeof window.global === 'undefined')
  window.global = window;

// Module system
var modules = {};
var require = function require(id) {
  if (++(require.depth) > 20)
    throw new Error('Recursive module dependencies');
  id = id.replace(/^[\/.]+/g, '');
  var module = modules[id];
  if (!module)
    throw new Error('No module with id "'+id+'"');
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

var move = require('index');
move.runtime.require = require;

// --------------------------------------------------------------
// Loading and executing <script>s

// Called when a Move script has been compiled (or failed to compile or load)
// For a <script> tag source, `origin` is the HTMLElement instance
move.onScriptLoaded = function onScriptLoaded(err, jscode, origin) {
  if (err) throw err;
  Function(jscode)();
};

// Compilation options used for <scrip> Move code which can be customized.
move.scriptCompilationOptions = {};

// Internal (used to run all Move <script>s found)
var runScripts = function runScripts() {
  var script, i, L, scripts, jscode,
      compileOptions = move.scriptCompilationOptions;
  scripts = document.getElementsByTagName('script');
  for (i=0, L=scripts.length; i < L; ++i) {
    script = scripts[i];
    if (script && script.type === 'text/move') {
      if (script.src) {
        compileOptions.filename = script.src;
        move.compileURL(script.src, compileOptions, function (err, jscode) {
          move.onScriptLoaded(err, jscode, script);
        });
      } else {
        try {
          compileOptions.filename = '<script>';
          jscode = move.compile(script.innerHTML, compileOptions);
          move.onScriptLoaded(null, jscode, script);
        } catch (e) {
          move.onScriptLoaded(e, script);
        }
      }
    }
  }
  return null;
};
if (window.addEventListener) {
  addEventListener('DOMContentLoaded', runScripts, false);
} else {
  attachEvent('onload', runScripts);
}

return move;
})();
