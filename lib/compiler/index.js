var fs; try{ fs = require('fs'); }catch(e){}
var http; try{ http = require('http'); }catch(e){}
var parser = require("./parser");
var processor = require("./process");
var astMutators = require("./ast-mutators");
require('../runtime/runtime_object');
require('../runtime/runtime_string');

// Available preprocessors
exports.preprocessors = {};

// Default compilation options
exports.defaultCompilationOptions = {
  // Input source
  source: null,
  filename: '?',
  globals: [],
  ignorePragmas: false,
  // preprocess: ['ehtml', 'my-preprocessor', ..],

  // AST transformations
  implicitReturns: true,
  automaticVarDeclarations: true,
  namedLambdas: true,
  strictEqualityOperators: true,
  keywordArguments: true,
  mangleNames: false,
  optimizationLevel: 0,
  runtimeClassCreation: true,  // enables use of the "class" function

  // Code generation
  moduleStub: false,
  codegen: true, // Toggle generation of code. If false, the AST is returned.
  outputFormatting: {indent_level: 2, beautify: true},
  detailedOutput: false, // if true, return {ast: <ast>, code: <code>}
  strict: true, // adds '"use strict";' to the head of generated js code
  raw: false // Do not wrap source and do not enable runtime
};

// Convert a filename to a module id
exports.filenameToModuleId = function filenameToModuleId(filename) {
  return String(filename).replace(/\/index$|^index$|^\/+|\/+$|\.[^\.]+$/g, '');
};


var formatSyntaxError = function (e, source, op) {
  e.name = 'MoveSyntaxError';

  var sourceLines = source.split(/[\r\n]/),
      lineIndex = e.line+1,
      contextLength = 3,
      start = (lineIndex < contextLength) ? 0 : lineIndex-contextLength;

  sourceLines = sourceLines.slice(start, lineIndex);
  //console.log('sourceLines', sourceLines, start, lineIndex);
  if (lineIndex > contextLength) {
    var dotdotindent = '';
    if (m = sourceLines[0].match(/^\s+/))
      for (x=0; x < m[0].length; ++x) dotdotindent += ' ';
    sourceLines[0] = dotdotindent+'...\n'+sourceLines[0];
  }
  sourceLines = sourceLines.join('\n');

  var epindent = ''; for (var x=0;x<e.col;++x) epindent += ' ';

  e.filename = op.filename
  e.sourceDetails = sourceLines+'\n'+epindent+'\u2b06';
  e.diagnostic = e.name+': '+e.message+' ('+op.filename+':'+e.line+':'+
                 e.col+')\n'+e.sourceDetails;
  if (e.stack)
    e.stack = e.diagnostic+'\n'+e.stack.split(/[\r\n]/).slice(1).join('\n');

  return e;
}


// If Move.debug is set to true, some things like compiled code will be output
// on console.log
//exports.debug = true;

// Compile Move `source` into JavaScript code.
//
// - compile (object kwargs) -> string|object
// - compile (string source, object options) -> string|object
//
exports.compile = function compile(source, options) {
  // Defaults options
  var op = Object.create(exports.defaultCompilationOptions);

  // Allow Move keyword call style
  if (typeof source === 'object') {
    options = source;
    source = options.source;
  }

  // falsy -> ""
  if (!source) source = '';

  // Coalesce options
  if (typeof options === 'object') for (var k in options) op[k] = options[k];

  // Obscure and should-not-be-changed-by-user options
  op.strictMode = false; // Puts the parser in strict mode
  op.embedTokens = false; // Enables embedding of node meta into the AST -- might break ast transforms

  // Look for preprocessor pragmas
  if (!op.ignorePragmas) {
    var yesRe = /^\s*(?:true|y.*|on|1)\s*$/i;
    source.forEachMatch(/^#\s*pragma\s+(\w+)\s(.+)/gm, function (m) {
      var k = m[1], v = m[2];
      switch (k) {
        case 'strict':
          op.strict = yesRe.test(v);
          break;

        case 'enable':
          if (v === 'ehtml') {
            if (!Array.isArray(op.preprocess)) {
              op.preprocess = ['ehtml'];
            } else if (op.preprocess.indexOf('ehtml') === -1) {
              op.preprocess.push('ehtml');
            }
          } else {
            throw new Error('Unknown value "'+v+'" for "enable" pragma');
          }
          break;

        case 'disable':
          if (v === 'ehtml') {
            if (Array.isArray(op.preprocess) && (v = op.preprocess.indexOf('ehtml')) !== -1) {
              op.preprocess.splice(v,1);
            }
          } else {
            throw new Error('Unknown value "'+v+'" for "disable" pragma');
          }
          break;

        default:
          throw new Error('Unknown pragma directive "'+k+'"');
      }
    });
  }

  // Preprocess source
  if (op.preprocess) {
    if (!Array.isArray(op.preprocess))
      throw Error('"preprocess" option must have an array value');
    op.preprocess.forEach(function (preprocessorNameOrFunction) {
      var preprocessor, processFun;

      // 1. preprocessor = preprocessorNameOrFunction
      // 2. preprocessor = exports.preprocessors[preprocessorNameOrFunction]
      // 3. preprocessor = require('./preprocessors/'+preprocessorNameOrFunction)
      if (typeof preprocessorNameOrFunction === 'function' ||
          typeof preprocessorNameOrFunction === 'object') {
        preprocessor = preprocessorNameOrFunction;
      } else if (!(preprocessor = exports.preprocessors[preprocessorNameOrFunction])) {
        preprocessor = require('./preprocessors/'+preprocessorNameOrFunction);
      }

      if (!preprocessor)
        throw Error('preprocessor '+preprocessorNameOrFunction+' not found');

      if (typeof preprocessor.process === 'function') {
        processFun = preprocessor.process;
      } else {
        processFun = preprocessor;
      }

      source = processFun.call(preprocessor, source, op);
    });
  }

  // Prepare source
  source += '\n';
  if (!op.raw)
    source = wrapInRuntime(source, op);

  // Parse Move and/or JavaScript source
  try {
    var ast = parser.parse(source, op);
    //console.log(require('util').inspect(ast, 0, 15));
  } catch (e) {
    // Add pretty error message with source line for parse errors
    if (e.name === 'JS_Parse_Error')
      e = formatSyntaxError(e, source, op);
    throw e;
  }

  // Mutate AST
  // TODO: Combine AST mutators into one or fewer walkers since each walk is
  //       very expensive.
  if (op.implicitReturns)
    ast = astMutators.add_implicit_returns(ast, op);
  if (op.automaticVarDeclarations) {
    var global_vars = [
        'global', 'process', 'require', 'window',
        '__filename', '__dirname', 'module'];
    if (Array.isArray(op.globals) && op.globals.length)
      global_vars = global_vars.concat(op.globals);
    if (op.moduleStub)
      global_vars.push('exports');
    ast = astMutators.first_time_var_delc(ast, global_vars, op);
  }
  if (op.namedLambdas)
    ast = astMutators.named_lambda_assignments(ast, op);
  if (op.strictEqualityOperators)
    ast = astMutators.enforce_strict_eq_ops(ast, op);
  if (op.keywordArguments)
    ast = astMutators.enable_keyword_arguments(ast, op);
  if (op.runtimeClassCreation)
    ast = astMutators.enable_class_rt_function(ast, op);
  if (op.mangleNames)
    ast = processor.ast_mangle(ast);

  // Apply optimizations
  if (op.optimizationLevel)
    ast = processor.ast_squeeze(ast);
  if (typeof op.optimizationLevel === 'number' && op.optimizationLevel > 1)
    ast = processor.ast_squeeze_more(ast);

  // Don't generate code?
  if (!op.codegen)
    return ast;

  // Generate JavaScript code
  var jscode = processor.gen_code(ast, op.outputFormatting);

  // Add "use strict"
  if (op.strict) {
    if (op.raw) {
      jscode = '"use strict";'+jscode;
    } else {
      jscode = jscode.replace(/\(function\s*\(\)\s*\{/,
                              '(function(){"use strict";');
    }
  }

  // Adjust wrap to module stub
  if (!op.raw && op.moduleStub) {
    // '(function () { ... })();'
    // -->
    // 'function(require,module,exports){ ... }'
    jscode = jscode.replace(/^\(function\s*\(\)\s*\{/, 'function(require,module,exports){')
                   .replace(/\)\(\);?$/, '');
  }

  // Output js code if debug
  if (exports.debug && typeof console !== 'undefined')
    console.log((options.filename || '<move code>')+' -> \n'+jscode);

  return op.detailedOutput ? {ast: ast, code: jscode} : jscode;
}

// Compile Move file at `filename` into JavaScript code
exports.compileFileSync = function compileFileSync(filename, options) {
  if (!fs)
    throw new Error('File system access is not supported');
  if (typeof options === 'object' && !options.filename) {
    options.filename = filename;
  } else {
    options = {filename: filename};
  }
  return exports.compile(fs.readFileSync(filename, 'utf8'), options);
}

// Evaluation convenience function
//
// Example:
//
//     move.eval("r = ^(a, b){ a * b-a * Math.PI }; r { a:1, b:8.1 }")
//     // 4.9584073464102065
//     move.eval("r = ^(a, b){ a * b-a * Math.PI }; r { b:1, a:8.1 }")
//     // -17.346900494077325
//
// eval(object options) -> any
// eval(string source, object options) -> any
// eval(string source, string filename) -> any
//
exports.eval = function (source, options) {
  // Allow Move keyword call style
  if (typeof source === 'object') {
    options = source;
    source = options.source;
  } else {
    if (!options || typeof options !== 'object') {
      if (typeof option === 'string') {
        options = {filename:options};
      } else {
        options = {};
      }
    }
    options.source = source;
  }
  var jsSource = exports.compile(options);
  return evalFunc(jsSource, options);
}

// Eval function
var evalFunc, ritc;
try {
  ritc = require('vm').runInThisContext;
  evalFunc = function _eval(jsSource, options) {
      // since the Node.js vm.runInThisContext only gives access to the global,
      // temporarily export the required variables:
      var global_ = {require:global.require};
      global.require = require;

      var r = ritc(
          jsSource.code !== undefined ? jsSource.code : jsSource,
          String((options && options.filename) || '<input>'));

      // reset global
      Object.keys(global_).forEach(function (k) {
        var v = global_[k];
        if (v !== undefined) global[k] = v;
        else delete global[k];
      });

      return r;
  }
} catch (e) {
  evalFunc = function _eval(jsSource, options) {
    var gr = global.require;
    global.require = Move.require;
    var r = global.eval(jsSource.code !== undefined ? jsSource.code : jsSource);
    if (gr !== undefined) global.require = gr;
    else delete global.require;
    return r;
  };
}

// Compile Move source at `url` into JavaScript code
// compileURL { url: string, [options: object], [callback: ^(err, jscode)] }
// compileURL(url, [options], [callback(err, jscode)])
//
if (typeof window !== 'undefined' && window) {
  // Browser implementation
  exports.compileURL = function compileURL(url, options, callback) {
    var kwargs = parseKWArgs(arguments, [['url'],['options'],['callback']]);
    if (typeof kwargs.options === 'function') {
      kwargs.callback = kwargs.options;
      kwargs.options = {};
    }
    var xhr = window.ActiveXObject ?
        new window.ActiveXObject('Microsoft.XMLHTTP') : new XMLHttpRequest;
    xhr.open('GET', kwargs.url, true);
    if ('overrideMimeType' in xhr)
      xhr.overrideMimeType('text/plain');
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        var jscode, err;
        var isHTTP = url.indexOf('://') !== -1
                     ? url.match(/^http/)
                     : document.location.protocol.match(/^http/);
        if ( (isHTTP && String(xhr.status).charAt(0) === '2') ||
             (!isHTTP && xhr.status === 0) ) {
          try {
            jscode = move.compile(xhr.responseText, kwargs.options);
          } catch (e) {
            err = e;
          }
        } else if (xhr.status && xhr.statusText) {
          err = new Error('HTTP request error: '+xhr.status+' '+xhr.statusText);
          err.httpStatus = xhr.status;
        } else {
          err = new Error('Unspecified HTTP request error');
        }
        if (typeof kwargs.callback === 'function') {
          kwargs.callback(err, jscode);
        } else if (err) {
          throw err;
        }
      }
    };
    return xhr.send(null);
  };
} else if (http) {
  // CommonJS/Node.js implementation
  // TODO
}

// ----------------------------------------------------------------------------

// An API like this would be nice:
// - compile { string: movesrc, ... } -> jssrc
// - compile { file: path, callback:... }
// - compile { file: path, sync:true, ... } -> jssrc
// - compile { url: url, callback:... }

var _MoveKWArgsT = require('../runtime/symbols')._MoveKWArgsT;

// Internal helper for accepting Move keyword arguments to our JS implementation
var parseKWArgs = function parseKWArgs(args, spec) {
  //kwargs = parseKWArgs(arguments, [['url'], ['options', default2], ['callback']])
  var firstArg = args[0], kwargs, k, v, i;
  if (typeof firstArg === "object" && firstArg.__kw === _MoveKWArgsT) {
    kwargs = firstArg;
    for (i=0;i<spec.length;++i) {
      k = spec[i][0];
      if (kwargs[k] === undefined && (v = spec[i][1]) !== undefined)
        kwargs[k] = v;
    }
  } else {
    kwargs = {};
    for (i=0;i<spec.length;++i) {
      k = spec[i][0];
      v = args[i];
      if (v === undefined) v = spec[i][1];
      if (v !== undefined) kwargs[k] = v;
    }
  }
  return kwargs;
}


// Wraps raw Move source, enabling access to the runtime library
var wrapInRuntime = function wrapInRuntime(source, op) {
  var s = '(function() { ';
  if (!op.automaticVarDeclarations)
    s += 'var ';
  s += 'M = Move.runtime';
  Object.keys(global.Move.runtime).forEach(function (name) {
    if (name === 'dprinter') {
      if (op.moduleStub) {
        s += ', dprint = M.dprinter(module)';
      }
    } else {
      s += ', ' + name + ' = M.'+name;
    }
  });
  return s + '; ' + source + '})()';
}

// Provide CommonJS module service for loading move code
if (require.extensions) {
  require.extensions['.mv'] = require.extensions['.move'] =
      function compileMoveModule(module, filename) {
    content = exports.compileFileSync(filename);
    return module._compile(content, filename);
  };
}

// Export our symbols to the Move global
Object.keys(exports).forEach(function (k) {
  global.Move[k] = exports[k];
});

// Import the runtime library
require('../runtime');