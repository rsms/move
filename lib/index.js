var fs; try{ fs = require('fs'); }catch(e){}
var parser = require("./parse-js");
var processor = require("./process");
var astMutators = require("./ast-mutators");

// Compile Move `source` into JavaScript code
exports.compile = function compile(source, options) {
  var op = {
    source: null,
    strictMode: false,
    embedTokens: false,
    implicitReturns: true,
    automaticVarDeclarations: true,
    namedLambdas: true,
    strictEqualityOperators: true,
    keywordArguments: true,
    mangleNames: false,
    strict: true, // adds '"use strict";' to the head of generated js code
    raw: false, // Do not wrap source and do not enable runtime
    optimizationLevel: 0,
    outputFormatting: {indent_level: 2},
    detailedOutput: false,
    globals: [],
    filename: '?'
  };
  
  // Allow Move keyword call style
  if (typeof source === 'object') {
    options = source;
    source = options.source;
  }

  // Coalesce options
  if (typeof options === 'object') for (var k in options) op[k] = options[k];
  
  // Wrap source
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
    ast = astMutators.add_implicit_returns(ast);
  if (op.automaticVarDeclarations) {
    var global_vars = [
        'global', 'process', 'require', 'window',
        '__filename', '__dirname', 'module'];
    if (Array.isArray(op.globals) && op.globals.length)
      global_vars = global_vars.concat(op.globals);
    ast = astMutators.first_time_var_delc(ast, global_vars);
  }
  if (op.namedLambdas)
    ast = astMutators.named_lambda_assignments(ast);
  if (op.strictEqualityOperators)
    ast = astMutators.enforce_strict_eq_ops(ast);
  if (op.keywordArguments)
    ast = astMutators.enable_keyword_arguments(ast);
  if (op.mangleNames)
    ast = processor.ast_mangle(ast);
  
  // Apply optimizations
  if (op.optimizationLevel)
    ast = processor.ast_squeeze(ast);
  if (typeof op.optimizationLevel === 'number' && op.optimizationLevel > 1)
    ast = processor.ast_squeeze_more(ast);

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

  return op.detailedOutput ? {ast: ast, code: jscode} : jscode;
}

// Compile Move file at `filename` into JavaScript code
exports.compileFileSync = function compileFile(filename, options) {
  if (!fs)
    throw new Error('File system access is not supported');
  if (typeof options === 'object' && !options.filename) {
    options.filename = filename;
  } else {
    options = {filename: filename};
  }
  return exports.compile(fs.readFileSync(filename, 'utf8'), options);
}

// Wraps raw Move source to have access to the runtime library
var wrapInRuntime = function wrapInRuntime(source, op) {
  var s = '(function () { ';
  if (!op.automaticVarDeclarations)
    s += 'var ';
  s += '__mvrt = __move.runtime';
  var names = Object.keys(exports.runtime);
  if (names.length) {
    s += ', ' + names.map(function (name) {
           return name + ' = __mvrt.'+name;
         }).join(',');
  }
  return s + '; ' + source + '})()';
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
    return evalFunc(jsSource, String(options.filename || '<input>'));
  })();
}
var evalFunc; try { evalFunc = require('vm').runInThisContext; } catch (e) {
                    evalFunc = eval; }

// Provide CommonJS module service for loading move code
if (require.extensions) {
  require.extensions['.mv'] = require.extensions['.move'] =
      function compileMoveModule(module, filename) {
    content = exports.compileFileSync(filename);
    return module._compile(content, filename);
  };
}

// Move runtime library -- move.runtime
global.__move = exports;
exports.runtime = {}; // for the actual runtime module
exports.runtime = require('./runtime');
