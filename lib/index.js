var fs; try{ fs = require('fs'); }catch(e){}
var http; try{ http = require('http'); }catch(e){}
var parser = require("./parser");
var processor = require("./process");
var astMutators = require("./ast-mutators");

// If __move.debug is set to true, some things like compiled code will be output
// on console.log
//exports.debug = true;

// Compile Move `source` into JavaScript code.
//
// - compile (object kwargs) -> string|object
// - compile (string source, object options) -> string|object
//
exports.compile = function compile(source, options) {
  // Defaults options
  var op = {
    // Input source
    source: null,
    filename: '?',
    globals: [],
    
    // AST transformations
    implicitReturns: true,
    automaticVarDeclarations: true,
    namedLambdas: true,
    strictEqualityOperators: true,
    keywordArguments: true,
    mangleNames: false,
    optimizationLevel: 0,
    
    // Code generation
    codegen: true, // Toggle generation of code. If false, the AST is returned.
    outputFormatting: {indent_level: 2},
    detailedOutput: false, // if true, return {ast: <ast>, code: <code>}
    strict: true, // adds '"use strict";' to the head of generated js code
    raw: false // Do not wrap source and do not enable runtime
  };
  
  // Allow Move keyword call style
  if (typeof source === 'object') {
    options = source;
    source = options.source;
  }

  // Coalesce options
  if (typeof options === 'object') for (var k in options) op[k] = options[k];
    
  // Obscure and should-not-be-changed-by-user options
  op.strictMode = false; // Puts the parser in strict mode
  op.embedTokens = false; // Enables embedding of node meta into the AST
  
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
    if (e.name === 'JS_Parse_Error') {
      e.name = 'SyntaxError';
      var epindent = ''; for (var x=0;x<e.col;++x) epindent += ' ';
      e.diagnostic = e.name+': '+e.message+'\n'+op.filename+':'+e.line+':'+
                     e.col+'\n'+source.split(/[\r\n]/)[e.line]+'\n'+
                     epindent+'\u2b06';
      if (e.stack)
        e.stack = e.diagnostic+'\n'+e.stack.split(/[\r\n]/).slice(1).join('\n');
    }
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
    ast = astMutators.first_time_var_delc(ast, global_vars, op);
  }
  if (op.namedLambdas)
    ast = astMutators.named_lambda_assignments(ast, op);
  if (op.strictEqualityOperators)
    ast = astMutators.enforce_strict_eq_ops(ast, op);
  if (op.keywordArguments)
    ast = astMutators.enable_keyword_arguments(ast, op);
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
exports.eval = function (source, options) {
  if (!options || typeof options !== 'object') options = {};
  var jsSource = exports.compile(source, options);
  return (function () {
    var move = exports;
    return evalFunc(jsSource.code !== undefined ? jsSource.code : jsSource,
                    String(options.filename || '<input>'));
  })();
}
var evalFunc; try { evalFunc = require('vm').runInThisContext; } catch (e) {
                    evalFunc = eval; }

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
  var s = '(function () { ';
  if (!op.automaticVarDeclarations)
    s += 'var ';
  s += 'Move = __move.runtime';
  var names = Object.keys(exports.runtime);
  if (names.length) {
    s += ', ' + names.map(function (name) {
           return name + ' = Move.'+name;
         }).join(',');
  }
  return s + '; ' + source + '})()';
}

// Provide CommonJS module service for loading move code
if (require.extensions) {
  require.extensions['.mv'] = require.extensions['.move'] =
      function compileMoveModule(module, filename) {
    content = exports.compileFileSync(filename, {
      optimizationLevel: 0
    });
    return module._compile(content, filename);
  };
}

// _MoveKWArgsT represents keyword arguments and is used for detection
var _MoveKWArgsT = function _MoveKWArgsT(obj) {
  obj.__kw = _MoveKWArgsT;
  return obj;
};

// Move runtime library -- move.runtime
global.__move = exports;
 // for the actual runtime module
exports.runtime = { _MoveKWArgsT: _MoveKWArgsT };
exports.runtime = require('./runtime');
