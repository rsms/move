// Move for web browers
if (!window.Move) window.Move = (function(){

if (typeof window.global === 'undefined')
  window.global = window;

/*#include require.js*/

// Module system
var module, modules = {};
var _require = Require();

// %CONTENT%

_require('%REQUIRE_ENTRY%');
var move = global.Move;

// --------------------------------------------------------------
move.version = function () { return %VERSION%; };

// --------------------------------------------------------------
move.require = Require();

%IF HAS_COMPILER%
// --------------------------------------------------------------
// Loading and executing <script>s

// Called when a Move script has been compiled (or failed to compile or load)
// For a <script> tag source, `origin` is the HTMLElement instance

if (typeof window.execScript === 'function') {
  // MSIE specific
  move.executeScript = function executeScript(jscode, origin) {
    return window.execScript(jscode);
  };
} else {
  // Fallback on window.eval
  move.executeScript = function executeScript(jscode, origin) {
    return window["eval"](jscode);
  };
}



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
    jscode = '(' + jscode + ')(Move.require, {exports:{}}, {});\n';
  }
  execute = execute || execute === undefined;
  return execute ? move.executeScript(null, jscode, uri) : jscode;
}


// Compilation options used for <script> Move code
move.scriptCompilationOptions = {preprocess:['ehtml']};

// Module wrapper
var wrapAsModule = function wrapAsModule(jscode, src, uri, id) {
  if (!id) id = src.replace(/\.[^\.]+$/, '');
  return 'Move.require.define('+
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
      var i = 0, L = completeQ.length, args;
      for (;i<L;++i) {
        // note: "apply", not "call". completeQ[i] => [err, jscode, uri, extra1, extraN, ..]
        args = completeQ[i];
        if (!args[0]) {
          move.executeScript.call(move, args[1], args[2]);
        } else { // error
          throw args[0];
        }
      }
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
        var moduleId = script.getAttribute('module');
        if (script.src) {
          opts.filename = script.src;
          opts.moduleStub = true;
          move.compileURL(opts.filename, opts, function (err, jscode) {
            if (!moduleId) {
              moduleId = script.getAttribute('src');
            }
            jscode = wrapAsModule(jscode, moduleId, opts.filename);
            completeQ[qIndex] = [err, jscode, opts.filename, script];
            decr();
          });
        } else {
          opts.filename = '<script module="'+moduleId+'">';
          try {
            // TODO: rip out into public function
            jscode = move.compileModule(script.innerHTML, moduleId, null, false, opts);
            completeQ[qIndex] = [null, jscode, opts.filename, script];
          } catch (e) {
            completeQ[qIndex] = [e, null, opts.filename, script];
          }
          decr();
        }
      })(nextQIndex++, script);
    }
  }
  decr();
  return null;
};
var move_boot = function move_boot() { move.runBrowserScripts(); };
if (window.addEventListener) {
  window.addEventListener("DOMContentLoaded", move_boot, false);
} else if (window.attachEvent) {
  window.attachEvent("onload", move_boot);
} else if (window.addEvent) {
	window.addEvent(window, "load", move_boot);
} else {
  window.onload = move_boot;
}
%ENDIF HAS_COMPILER%

return move;
})();