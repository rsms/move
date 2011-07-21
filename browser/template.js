// Move for web browers
if (!window.move) window.move = (function(){

if (typeof window.global === 'undefined')
  window.global = window;

// Module system
var module, modules = {};
var _require = function _require(id) {
  if (++(_require.depth) > 20)
    throw new Error('Recursive module dependencies');
  id = id.replace(/^[\/.]+/g, '');
  var module = modules[id];
  if (!module)
    throw new Error('No module with id "'+id+'"');
  if (module.block) {
    var block = module.block;
    module.block = null;
    block(module.exports, _require, module);
  }
  _require.depth--;
  return module.exports;
};
_require.depth = 0;

// %CONTENT%

var move = _require('index');
move.runtime._require = _require;

// --------------------------------------------------------------
move.version = function () { return %VERSION%; };

// --------------------------------------------------------------
/*#include require.js*/
move.require = Require();

// --------------------------------------------------------------
// Loading and executing <script>s

// Called when a Move script has been compiled (or failed to compile or load)
// For a <script> tag source, `origin` is the HTMLElement instance
move.executeScript = function executeScript(err, jscode, origin) {
  if (err) throw err;
  Function(jscode)();
};


// Convenience function for compiling and defining modules based on move source
move.compileModule = function compileModule(mvcode, id, uri, execute, compileOptions) {
  var jscode;
  if (typeof compileOptions === 'object') {
    compileOptions = Object.create(compileOptions);
  } else {
    compileOptions = {};
  }
  compileOptions.filename = uri || ('<'+(id || 'main')+'>');
  compileOptions.moduleStub = true;
  jscode = move.compile(mvcode, compileOptions);
  if (id) {
    jscode = wrapAsModule(jscode, null, uri, id);
  } else {
    jscode = '(' + jscode + ')(__move.require, {exports:{}}, {});\n';
  }
  execute = execute || execute === undefined;
  return execute ? move.executeScript(null, jscode, uri) : jscode;
}


// Compilation options used for <script> Move code
move.scriptCompilationOptions = {preprocess:['ehtml']};

// Module wrapper
var wrapAsModule = function wrapAsModule(jscode, src, uri, id) {
  if (!id) id = src.replace(/\.[^\.]+$/, '');
  return '__move.require.define('+
    JSON.stringify(id)+','+
    JSON.stringify(uri || src)+','+
    jscode + ');\n';
};

// Internal (used to run all Move <script>s found)
move.runBrowserScripts = function runBrowserScripts(rootElement, callback) {
  var script, i, L, scripts, jscode,
      compileOptions = Object.create(move.scriptCompilationOptions),
      nextQIndex = 0, completeQ = [], pending = 0;
  var incr = function () { ++pending; };
  var decr = function () {
    if ((--pending) === 0) {
      // all loaded -- exec in order
      var i = 0, L = completeQ.length;
      for (;i<L;++i)
        move.executeScript.apply(move, completeQ[i]);
      if (typeof callback === 'function')
        callback(null, completeQ);
    }
  };
  scripts = (rootElement || document).getElementsByTagName('script');
  incr();
  for (i=0, L=scripts.length; i < L; ++i) {
    script = scripts[i];
    if (script && script.type === 'text/move') {
      (function (qIndex, script) {
        incr();
        var opts = Object.create(compileOptions);
        if (script.src) {
          opts.filename = script.src;
          opts.moduleStub = true;
          move.compileURL(opts.filename, opts, function (err, jscode) {
            jscode = wrapAsModule(jscode, script.getAttribute('src'), opts.filename);
            completeQ[qIndex] = [err, jscode, script];
            decr();
          });
        } else {
          try {
            // RIP OUT into public function
            var id = script.getAttribute('module');
            jscode = move.compileModule(script.innerHTML, id, null, false, opts);
            completeQ[qIndex] = [null, jscode, script];
          } catch (e) {
            completeQ[qIndex] = [e, null, script];
          }
          decr();
        }
      })(nextQIndex++, script);
    }
  }
  decr();
  return null;
};
var _runScripts = function () { move.runBrowserScripts(); };
if (window.addEventListener) {
  window.addEventListener('DOMContentLoaded', _runScripts, false);
} else {
  window.attachEvent('onload', _runScripts);
}

return move;
})();