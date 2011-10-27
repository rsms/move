// Move for web browers
if (!window.Move) window.Move = (function(){

if (typeof window.global === 'undefined')
  window.global = window;

// CommonJS compatible module loading.
// (Except from require.paths, it's compliant with spec 1.1.1.)
var Require = function Require(parentExports) {
  
  // normalize an array of path components
  function normalizeArray(parts) {
    var up = 0;
    for (var i = parts.length; i >= 0; i--) {
      var last = parts[i];
      if (last == '.') {
        parts.splice(i, 1);
      } else if (last === '..') {
        parts.splice(i, 1);
        up++;
      } else if (up) {
        parts.splice(i, 1);
        up--;
      }
    }
    return parts;
  }
  
  // normalize an id
  function normalizeId(id, parentId) {
    id = id.replace(/\/+$/g, '');
    var components = (parentId ? parentId + '/../' + id : id).split('/');
    return normalizeArray(components).join('/');
  }
  
  // normalize a url
  function normalizeUrl(url, baseLocation) {
    if (!(/^\w+:/).test(url)) {
      var u = baseLocation.protocol+'//'+baseLocation.hostname;
      if (baseLocation.port && baseLocation.port !== 80) {
        u += ':'+baseLocation.port;
      }
      var path = baseLocation.pathname;
      if (url.charAt(0) === '/') {
        url = u + normalizeArray(url.split('/')).join('/');
      } else {
        path += ((path.charAt(path.length-1) === '/') ? '' : '/../') + url;
        url = u + normalizeArray(path.split('/')).join('/');
      }
    }
    return url;
  }
  
  // define a constant (read-only) value property
  var defineConstant;
  if (Object.defineProperty) {
    defineConstant = function (obj, name, value) {
      Object.defineProperty(obj, name, {value: value, writable: false,
        enumerable: true, configurable: false});
    }
  } else {
    defineConstant = function (obj, name, value) { obj[name] = value; }
  }
  
  // require/load/import a module
  // require(id[, parentId]) -> [object module-api]
  // @throws Error /module not found (json-rep-of-id)/
  function require (id, parentId, parentURI) {
    var originalInputId = id; // for "not found" error message
    if (id.charAt(0) === '.') {
      if (parentURI && parentURI.indexOf(parentId+'/index') !== -1)
        parentId += '/index'
      var id1 = id;
      id = normalizeId(id, parentId);
    }
    if (!require.modules.hasOwnProperty(id)) {
      throw new Error('Module not found '+JSON.stringify(originalInputId));
    }
    var mod = require.modules[id];
    if (mod.exports === undefined) {
      var _require = function (_id) {
        return require(_id, id, mod.uri);
      };
      defineConstant(_require, 'main', require.main);
      var block = mod.block; delete mod.block;
      mod.exports = {};
      if (require.initFilter) {
        block = require.initFilter(block);
      }
      block(_require, mod, mod.exports);
    }
    return mod.exports;
  }
  
  // define a module
  // define(String id, [String uri,] block(require, module, exports){...})
  function define (id, uri, block) {
    if (typeof uri === 'function') {
      block = uri; uri = null;
    }
    var mod = {block: block};
    defineConstant(mod, 'id', String(id));
    if (uri) {
      defineConstant(mod, 'uri', String(uri));
    }
    require.modules[mod.id] = mod;
    return mod;
  }
  
  // modules keyed by id
  require.modules = {};
  // search paths -- disabled until we use/need this
  //require.paths = [];
  // main module, accessible from require.main
  var mainModule = define('');
  delete mainModule.block;
  mainModule.exports = parentExports || {};
  defineConstant(require, 'main', mainModule);
  // the define function
  require.define = define;

  return require;
};

// Module system
var module, modules = {};
var _require = Require();

_require.define("compiler/ast-mutators","compiler/ast-mutators.js",function(require, module, exports, __filename, __dirname){var parser = require("./parser");
var processor = require("./process");

// AST modifier which adds implicit returns to the last statement of a function
exports.add_implicit_returns = function add_implicit_returns(ast) {
  var w = processor.ast_walker(),
      MAP = processor.MAP,
      wrapStatement;

  wrapStatement = function wrapStatement(statement) {
    if (!statement) return statement;
    var type = statement[0], i;
    if (type === 'stat') {
      // a statement e.g. "5 * 7" or "prefix + name.toString()"
      statement[0] = 'return';
    } else if (type === 'defun') {
      // an anonymous function definition
      statement[0] = 'function';
      return ['return', statement];
    } else if (type === 'if') {
      for (i=2; i<statement.length; ++i)
        statement[i] = wrapStatement(statement[i]);
    } else if (type === 'block') {
      var parts = statement[1];
      if (parts && parts.length !== 0)
        parts[parts.length-1] = wrapStatement(parts[parts.length-1]);
    } //else console.log('last stmt', statement);
    return statement;
  };

  var _lambda = function _lambda(name, args, body, kwargs) {
    if (body.length) {
      // here, body[body.length-1] == ['if', [...]]
      body[body.length-1] = wrapStatement(body[body.length-1]);
    }
    return [ this[0], name, args.slice(), MAP(body, w.walk), kwargs ];
  };
  var ret = w.with_walkers({
    "defun": _lambda,
    "function": _lambda
  }, function(){
    return w.walk(ast);
  });
  return ret;
}


// AST modifier which declares first-time assignments as vars
exports.first_time_var_delc = function first_time_var_delc(ast, globals) {
  var w = processor.ast_walker(), MAP = processor.MAP, Scope = processor.Scope;
  var current_scope = null, slice = parser.slice;

  if (globals) {
    current_scope = new Scope();
    current_scope.names = parser.array_to_hash(globals);
  }

  function with_new_scope(cont) {
    current_scope = new Scope(current_scope);
    current_scope.vars = [];
    var ret = current_scope.body = cont();

    // declare variables at top of function
    if (current_scope.vars.length) {
      var subs = (ret[0] === 'toplevel') ? ret[1] : ret;
      var vars = ['var', MAP(current_scope.vars, function (v) { return [v] })];
      subs.splice(0, 0, vars);
    }

    //ret.scope = current_scope;
    current_scope = current_scope.parent;
    return ret;
  }

  function define(name) {
    return current_scope.define(name);
  }

  function _lambda(name, args, body, kwargs) {
    return [ this[0], define(name), args, with_new_scope(function(){
      MAP(args, define);
      return MAP(body, w.walk);
    }), kwargs];
  }

  return with_new_scope(function(){
    var ret = w.with_walkers({
      "defun": _lambda,
      "function": _lambda,
      /*"var": function(defs) {
        var subs = ['assign', true];
        MAP(defs, function(d){
          define(d[0]);
          current_scope.vars.push(d[0]);
          if (d.length > 1) {
            subs.push(['name', d[0]]);
            subs.push(d[1]);
          }
        })
        return subs.length > 2 ? ['stat', subs] : null;
      },*/

      "var": function(defs) {
        return [ this[0], MAP(defs, function(def){
          define(def[0]);
          //current_scope.vars.push(def[0]);
          var a = [ def[0] ];
          if (def.length > 1)
            a[1] = w.walk(def[1]);
          return a;
        }) ];
      },
      "import": function(defs) {
        MAP(defs, function(d){
          define(d[0]);
          current_scope.vars.push(d[0]);
        });
      },
      "export": function(defs) {
        MAP(defs, function(d){
          define(d[0]);
          current_scope.vars.push(d[0]);
        });
      },
      "const": function(defs) {
        MAP(defs, function(d){ define(d[0]) });
      },
      "assign": function(op, lvalue, rvalue) {
        if (lvalue[0] === 'name') {
          var name = lvalue[1];
          var value = current_scope.has(name);
          if (!value) {
            current_scope.vars.push(name);
            define(name);
          }
        }
        return [ this[0], op, w.walk(lvalue), w.walk(rvalue) ];
      },
      "for-in": function(vvar, key, hash, block) {
        if (vvar) {
          return [ this[0], w.walk(vvar), w.walk(key), w.walk(hash),
                   w.walk(block) ];
        } else {
          if (!current_scope.has(key)) {
            current_scope.vars.push(key);
            define(key);
          }
          return [ this[0], vvar, key, w.walk(hash), w.walk(block) ];
        }
      },
    }, function(){
      return w.walk(ast);
    });
    return ret;
  });
}


// Matches a dot-capable name (which does not need to use subscript notation)
var DOT_NAME_RE = /^[_\$a-z][_\$\w\d]*$/i;


var nameOfAssignmentValue = function nameOfAssignmentValue(value) {
  var name;
  if (value[0] === 'name') {
    name = value[1];
  } else if (value[0] === 'dot') {
    name = value[value.length-1];
  } else if (value[0] === 'sub') {
    value = value[value.length-1];
    if (value[0] === 'string') {
      name = value[1];
      if (parser.KEYWORDS[name] || parser.RESERVED_WORDS[name] || !DOT_NAME_RE.test(name)) {
        name = undefined;
      }
    } else {
      name = value;  // a symbol -- up to the caller to decide to use or not
    }
  }
  return name;
}


// AST modifier which give a anonymous function expression name from assignment
exports.named_lambda_assignments = function named_lambda_assignments(ast) {
  var w = processor.ast_walker(), MAP = processor.MAP;
  var ret = w.with_walkers({
    "export": function (defs) {
      return [ this[0], MAP(defs, function(def){
        var a = [ def[0] ];
        if (def.length > 1) {
          // Assign name to anonymous, exported function
          if (def[1] && def[1][0] === 'function' && !def[1][1])
            def[1][1] = def[0];
          a[1] = w.walk(def[1]);
        }
        return a;
      }) ];
    },
    "assign": function(op, lvalue, rvalue) {
      //if (rvalue[0] === 'function' && rvalue[1])
        //console.log('rvalue', rvalue)
      if (Array.isArray(rvalue) && rvalue[0] === 'function' && !rvalue[1]) {
        var name = nameOfAssignmentValue(lvalue);
        if (typeof name === 'string')
          rvalue[1] = name;
      }
      return [ this[0], op, w.walk(lvalue), w.walk(rvalue) ];
    }
  }, function(){
    return w.walk(ast);
  });
  return ret;
}


// AST modifier which converts type-coercing comparison operators to regular,
// strict operators (i.e. "==" -> "===" and "!=" -> "!==")
exports.enforce_strict_eq_ops = function enforce_strict_eq_ops(ast) {
  var w = processor.ast_walker(), MAP = processor.MAP;
  return w.with_walkers({
    "binary": function(op, left, right) {
      if (op === '==') op = '===';
      else if (op === '!=') op = '!==';
      return [ this[0], op, w.walk(left), w.walk(right) ];
    }
  }, function(){ return w.walk(ast); });
}


// AST modifier which mutates function declarations to accept keyword arguments
exports.enable_keyword_arguments =
    function enable_keyword_arguments(ast, options) {
  var w = processor.ast_walker(), MAP = processor.MAP;
  if (typeof options !== 'object') options = {};
  var kwTestRValue = options.raw ? 'true' : '_MoveKWArgsT';

  return w.with_walkers({

    "function": function (name, args, body, kwargs) {
      // Add test and assigments for keyword arguments.
      //
      // Given the following Move code:
      //
      //    x = ^(a=1, b=2, c=3) {
      //      // ...
      //    }
      //
      // Applying our transformations, the code becomes:
      //
      //    x = ^(a, b, c) {
      //      typeof a === "object" && a.__kw === true && (c = a.c, b = a.b, a = a.a);
      //      if (c === undefined) c = 3;
      //      if (b === undefined) b = 2;
      //      if (a === undefined) a = 1;
      //      // ...
      //    }
      //
      if (args.length) {
        var i, argName, defaultValue, kwAssign = ['seq'];
        var firstArgName = args[0], statements = [null];

        // typeof arg1 === "object" && arg1.__kw === true
        var kwHeaderTestStmt =
            ['binary', '&&',
              ['binary', '!==',
                ['name', firstArgName],
                ['name', 'null']],
              ['binary', '&&',
                ['binary', '===',
                  ['unary-prefix', 'typeof', ['name', firstArgName]],
                  ['string', 'object']],
                ['binary', '===',
                  ['dot', ['name', firstArgName], '__kw'],
                  ['name', kwTestRValue]]
              ]
            ];

        kwAssign.push(['assign', true,
          ['dot', ['name', 'arguments'], 'keywords'],
          ['name', firstArgName]]);

        for (i=args.length; --i !== -1;) {
          argName = args[i];
          defaultValue = kwargs && kwargs[argName];

          // (arg3 = arg1.arg3, ...
          kwAssign.push(['assign', true,
              ['name', argName],
              ['dot', ['name', firstArgName], argName]]);

          if (defaultValue) {
            // if (arg3 === undefined) arg3 = default3, ...
            statements.push(['if',
                ['binary','===', ['name', argName], ['name', 'undefined']],
                ['stat', ['assign', true, ['name', argName], defaultValue]]
              ]);
          }
        }

        // <kwHeaderTestStmt> && (arg3 = arg1.arg3, arg2 = arg1.arg2, arg1 = arg1.arg1)
        statements[0] = ['stat', ['binary', '&&', kwHeaderTestStmt, kwAssign]];
        //console.log(require('util').inspect(statements, 0, 10));
        body = statements.concat(body);
      }
      // Walk function body...
      return [this[0], name, args, MAP(body, w.walk), kwargs];
    },

    "call": function (expr, args) {
      if (args.length === 1 && args[0][0] === 'object') {
        var kwarg, kwargs = args[0][1], kwargsIndexes = [];
        for (var i=kwargs.length; --i !== -1;) {
          kwarg = kwargs[i];
          if (kwarg[0] === '__kw' && kwarg[1] &&
              kwarg[1][1] === '__Move_KWArgs__') {
            kwargsIndexes.push(i);
          }
        }
        if (kwargsIndexes.length) {
          // In order to get rid of duplicates
          while (kwargsIndexes.length > 1)
            delete kwargs[kwargsIndexes.pop()];
          kwargs[kwargsIndexes.pop()] = ['__kw', ['name', kwTestRValue]];
        }
      }
      return [ this[0], w.walk(expr), MAP(args, w.walk) ];
    }

  }, function(){ return w.walk(ast); });
}


var disarmKeywordArguments = function disarmKeywordArguments(objExpr, options) {
  var pairs, pair, i;
  if (objExpr && objExpr[0] === 'object') {
    pairs = objExpr[1];
    for (i=0; i<pairs.length; i++) {
      pair = pairs[i];
      if (pair[0] === '__kw' && pair[1][0] === 'name' &&
            ( (options.raw && pair[1][1] === 'true') ||
              (!options.raw && pair[1][1] === '_MoveKWArgsT') )  ) {
        pairs.splice(i, 1);
        return true;
      }
    }
  }
  return false;
};


// Enabled the use of "class" -> "Move.runtime.__class"
exports.enable_class_rt_function = function enable_class_rt_function(ast, options) {
  var w = processor.ast_walker(), MAP = processor.MAP;
  var lastAssignmentName;

  return w.with_walkers({
    "name": function(name) {
      if (name === 'class')
        name = '__class';
      return [ this[0], name ];
    },

    "assign": function(op, lvalue, rvalue) {
      var name = nameOfAssignmentValue(lvalue);
      // Save a reference to the closest (but not further) assignment target
      lastAssignmentName = (typeof name === 'string') ? name : undefined;
      r = [ this[0], op, w.walk(lvalue), w.walk(rvalue) ];
      lastAssignmentName = undefined;
      return r;
    },

    "call": function(expr, args) {
      var name, arg, i, keyValuePairs, pair;
      if (expr[0] === 'name' && expr[1] === 'class' && lastAssignmentName) {
        name = lastAssignmentName || '__UntitledClass'
        // Prepend arguments with "T = ^{ __class.create T, arguments }"
        args.unshift([ 'assign',
              true,
              [ 'name', name ],
              [ 'function', name,
                [],
                [ [ 'return',
                    [ 'call',
                      [ 'dot', [ 'name', '__class' ], 'create' ],
                      [ [ 'name', name ], [ 'name', 'arguments' ] ] ] ] ]
              ] ]);
        // disarm keyword arguments (only if first argument is an object)
        disarmKeywordArguments(args[1], options);
      }
      return [ this[0], w.walk(expr), MAP(args, w.walk) ];
    }

  }, function(){ return w.walk(ast); });
}
});
_require.define("compiler","compiler/index.js",function(require, module, exports, __filename, __dirname){var fs; try{ fs = require('fs'); }catch(e){}
var http; try{ http = require('http'); }catch(e){}
var parser = require("./parser");
var processor = require("./process");
var astMutators = require("./ast-mutators");
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

  // Adjust wrap to module stub
  if (!op.raw && op.moduleStub) {
    jscode = jscode.replace(/^\(function\s*\(\)\s*\{/, 'function(require,module,exports){')
                   .replace(/\)\(\);$/, '');
  }

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
require('../runtime');});
_require.define("compiler/parser","compiler/parser.js",function(require, module, exports, __filename, __dirname){/***********************************************************************

  A JavaScript tokenizer / parser / beautifier / compressor.

  This version is suitable for Node.js.  With minimal changes (the
  exports stuff) it should work on any JS platform.

  This file contains the tokenizer/parser.  It is a port to JavaScript
  of parse-js [1], a JavaScript parser library written in Common Lisp
  by Marijn Haverbeke.  Thank you Marijn!

  [1] http://marijn.haverbeke.nl/parse-js/

  Exported functions:

  - tokenizer(code) -- returns a function.  Call the returned
  function to fetch the next token.

  - parse(code) -- returns an AST of the given JavaScript code.

  -------------------------------- (C) ---------------------------------

         Author: Mihai Bazon
       <mihai.bazon@gmail.com>
       http://mihai.bazon.net/blog

  Distributed under the BSD license:

  Copyright 2010 (c) Mihai Bazon <mihai.bazon@gmail.com>
  Based on parse-js (http://marijn.haverbeke.nl/parse-js/).

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions
  are met:

  * Redistributions of source code must retain the above
    copyright notice, this list of conditions and the following
    disclaimer.

  * Redistributions in binary form must reproduce the above
    copyright notice, this list of conditions and the following
    disclaimer in the documentation and/or other materials
    provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDER “AS IS” AND ANY
  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
  PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE
  LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
  OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
  PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
  THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
  TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
  THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
  SUCH DAMAGE.

 ***********************************************************************/

/* -----[ Tokenizer (constants) ]----- */

var KEYWORDS = array_to_hash([
  "break",
  "case",
  "catch",
  "const",
  "continue",
  "default",
  "delete",
  "do",
  "else",
  "finally",
  "for",
  "function",
  "if",
  "in",
  "instanceof",
  "new",
  "return",
  "switch",
  "throw",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "import",
  "export",
  "xor"
]);
exports.KEYWORDS = KEYWORDS;

var RESERVED_WORDS = array_to_hash([
  "abstract",
  "boolean",
  "byte",
  "char",
  "class",
  "debugger",
  "double",
  "enum",
  "extends",
  "final",
  "float",
  "goto",
  "implements",
  "int",
  "interface",
  "long",
  "native",
  "package",
  "private",
  "protected",
  "public",
  "short",
  "static",
  "super",
  "synchronized",
  "throws",
  "transient",
  "volatile"
]);
exports.RESERVED_WORDS = RESERVED_WORDS;

var KEYWORDS_BEFORE_EXPRESSION = array_to_hash([
  "return",
  "new",
  "delete",
  "throw",
  "else",
  "case"
]);

var KEYWORDS_ATOM = array_to_hash([
  "false",
  "null",
  "true",
  "undefined"
]);

var OPERATOR_CHARS = array_to_hash(characters("+-*&%=<>!?|~"));

var RE_HEX_NUMBER = /^0x[0-9a-f]+$/i;
var RE_OCT_NUMBER = /^0[0-7]+$/;
var RE_DEC_NUMBER = /^\d*\.?\d*(?:e[+-]?\d*(?:\d\.?|\.?\d)\d*)?$/i;

var OPERATORS = array_to_hash([
  "in",
  "instanceof",
  "typeof",
  "new",
  "void",
  "delete",
  "++",
  "--",
  "+",
  "-",
  "!",
  "~",
  "&",
  "|",
  "*",
  "/",
  "%",
  ">>",
  "<<",
  ">>>",
  "<",
  ">",
  "<=",
  ">=",
  "==",
  "===",
  "!=",
  "!==",
  "?",
  "=",
  "+=",
  "-=",
  "/=",
  "*=",
  "%=",
  ">>=",
  "<<=",
  ">>>=",
  "%=",
  "|=",
  "&=",
  "&&",
  "||",

  // XOR (since Move use "^" for "Lambda")
  "xor",
  //"xor=",
]);

var WHITESPACE_CHARS = array_to_hash(characters(" \n\r\t"));

var PUNC_BEFORE_EXPRESSION = array_to_hash(characters("[{}(,.;:"));

var PUNC_CHARS = array_to_hash(characters("[]{}(),;:"));

var REGEXP_MODIFIERS = array_to_hash(characters("gmsiy"));

/* -----[ Tokenizer ]----- */

function is_alphanumeric_char(ch) {
  ch = ch.charCodeAt(0);
  return (ch >= 48 && ch <= 57) ||
    (ch >= 65 && ch <= 90) ||
    (ch >= 97 && ch <= 122);
};

function is_identifier_char(ch) {
  return is_alphanumeric_char(ch) || ch == "$" || ch == "_";
};

function is_digit(ch) {
  ch = ch.charCodeAt(0);
  return ch >= 48 && ch <= 57;
};

function parse_js_number(num) {
  if (RE_HEX_NUMBER.test(num)) {
    return parseInt(num.substr(2), 16);
  } else if (RE_OCT_NUMBER.test(num)) {
    return parseInt(num.substr(1), 8);
  } else if (RE_DEC_NUMBER.test(num)) {
    return parseFloat(num);
  }
};

function JS_Parse_Error(message, line, col, pos) {
  this.name = 'JS_Parse_Error';
  this.message = message;
  this.line = line;
  this.col = col;
  this.pos = pos;
  try {
    ({})();
  } catch(ex) {
    this.stack = this.message;
    if (ex && ex.stack)
      this.stack += '\n' + ex.stack.split(/[\r\n]/).slice(3).join('\n');
  };
};

JS_Parse_Error.prototype.toString = function() {
  return this.message + " (line: " + this.line + ", col: " + this.col + ", pos: " + this.pos + ")" + "\n\n" + this.stack;
};

function js_error(message, line, col, pos) {
  throw new JS_Parse_Error(message, line, col, pos);
};

function is_token(token, type, val) {
  return token.type == type && (val == null || token.value == val);
};

var EX_EOF = {};

function tokenizer($TEXT, options) {
  if (typeof options !== 'object') options = {};

  var S = {
    text    : $TEXT.replace(/\r\n?|[\n\u2028\u2029]/g, "\n").replace(/^\uFEFF/, ''),
    pos     : 0,
    tokpos    : 0,
    line    : 0,
    tokline   : 0,
    col     : 0,
    tokcol    : 0,
    newline_before  : false,
    regex_allowed   : false,
    comments_before : [],
    queued_tokens: []
  };

  function peek() { return S.text.charAt(S.pos); };

  function next(signal_eof) {
    var ch = S.text.charAt(S.pos++);
    if (signal_eof && !ch)
      throw EX_EOF;
    if (ch == "\n") {
      S.newline_before = true;
      ++S.line;
      S.col = 0;
    } else {
      ++S.col;
    }
    return ch;
  };

  function eof() {
    return !S.peek();
  };

  function find(what, signal_eof) {
    var pos = S.text.indexOf(what, S.pos);
    if (signal_eof && pos == -1) throw EX_EOF;
    return pos;
  };

  function start_token() {
    S.tokline = S.line;
    S.tokcol = S.col;
    S.tokpos = S.pos;
  };

  function token(type, value, is_comment) {
    S.regex_allowed = (
        (type == "operator" && !HOP(UNARY_POSTFIX, value))
        || (type === "keyword" && HOP(KEYWORDS_BEFORE_EXPRESSION, value))
        || (type === "punc" && HOP(PUNC_BEFORE_EXPRESSION, value))
        /*|| (type === 'name')
            BUG:
            - Enables regexp as fist arg to shorthand call-style e.g. foo /.+/
            - But BREAKS division e.g. x / 5

            Related unit test: regression-parser-shorthand-regexp.js
        */
        );
    var ret = {
      type  : type,
      value : value,
      line  : S.tokline,
      col   : S.tokcol,
      pos   : S.tokpos,
      nlb   : S.newline_before
    };
    if (!is_comment) {
      ret.comments_before = S.comments_before;
      S.comments_before = [];
    }
    S.newline_before = false;
    S.prev_token = ret;
    return ret;
  };

  function skip_whitespace() {
    while (HOP(WHITESPACE_CHARS, peek()))
      next();
  };

  function read_while(pred) {
    var ret = "", ch = peek(), i = 0;
    while (ch && pred(ch, i++)) {
      ret += next();
      ch = peek();
    }
    return ret;
  };

  function parse_error(err) {
    js_error(err, S.tokline, S.tokcol, S.tokpos);
  };

  function read_num(prefix) {
    var has_e = false, after_e = false, has_x = false, has_dot = prefix == ".";
    var num = read_while(function(ch, i){
      if (ch == "x" || ch == "X") {
        if (has_x) return false;
        return has_x = true;
      }
      if (!has_x && (ch == "E" || ch == "e")) {
        if (has_e) return false;
        return has_e = after_e = true;
      }
      if (ch == "-") {
        if (after_e || (i == 0 && !prefix)) return true;
        return false;
      }
      if (ch == "+") return after_e;
      after_e = false;
      if (ch == ".") {
        if (!has_dot)
          return has_dot = true;
        return false;
      }
      return is_alphanumeric_char(ch);
    });
    if (prefix)
      num = prefix + num;
    var valid = parse_js_number(num);
    if (!isNaN(valid)) {
      return token("num", valid);
    } else {
      parse_error("Invalid syntax: " + num);
    }
  };

  function read_escaped_char() {
    var ch = next(true);
    switch (ch) {
      case "n" : return "\n";
      case "r" : return "\r";
      case "t" : return "\t";
      case "b" : return "\b";
      case "v" : return "\v";
      case "f" : return "\f";
      case "0" : return "\0";
      case "x" : return String.fromCharCode(hex_bytes(2));
      case "u" : return String.fromCharCode(hex_bytes(4));
      default  : return ch;
    }
  };

  function hex_bytes(n) {
    var num = 0;
    for (; n > 0; --n) {
      var digit = parseInt(next(true), 16);
      if (isNaN(digit))
        parse_error("Invalid hex-character pattern in string");
      num = (num << 4) | digit;
    }
    return num;
  };

  function read_string() {
    return with_eof_error("Unterminated string constant", function(){
      var quote = next(), ret = "";
      for (;;) {
        var ch = next(true);
        if (ch == "\\") ch = read_escaped_char();
        else if (ch == quote) break;
        ret += ch;
      }
      return token("string", ret);
    });
  };

  function read_line_comment() {
    next();
    var i = find("\n"), ret;
    if (i == -1) {
      ret = S.text.substr(S.pos);
      S.pos = S.text.length;
    } else {
      ret = S.text.substring(S.pos, i);
      S.pos = i;
    }
    return token("comment1", ret, true);
  };

  function read_multiline_comment() {
    next();
    return with_eof_error("Unterminated multiline comment", function(){
      var i = find("*/", true),
        text = S.text.substring(S.pos, i),
        tok = token("comment2", text, true);
      S.pos = i + 2;
      S.line += text.split("\n").length - 1;
      S.newline_before = text.indexOf("\n") >= 0;
      return tok;
    });
  };

  function read_regexp() {
    return with_eof_error("Unterminated regular expression", function(){
      var prev_backslash = false, regexp = "", ch, in_class = false;
      while ((ch = next(true))) if (prev_backslash) {
        regexp += "\\" + ch;
        prev_backslash = false;
      } else if (ch == "[") {
        in_class = true;
        regexp += ch;
      } else if (ch == "]" && in_class) {
        in_class = false;
        regexp += ch;
      } else if (ch == "/" && !in_class) {
        break;
      } else if (ch == "\\") {
        prev_backslash = true;
      } else {
        regexp += ch;
      }
      var mods = read_while(function(ch){
        return HOP(REGEXP_MODIFIERS, ch);
      });
      return token("regexp", [ regexp, mods ]);
    });
  };

  function read_operator(prefix) {
    function grow(op) {
      if (!peek()) return op;
      var bigger = op + peek();
      if (HOP(OPERATORS, bigger)) {
        next();
        return grow(bigger);
      } else {
        return op;
      }
    };
    return token("operator", grow(prefix || next()));
  };

  function handle_slash() {
    next();
    var regex_allowed = S.regex_allowed;
    switch (peek()) {
      case "/":
      S.comments_before.push(read_line_comment());
      S.regex_allowed = regex_allowed;
      return next_token();
      case "*":
      S.comments_before.push(read_multiline_comment());
      S.regex_allowed = regex_allowed;
      return next_token();
    }
    return S.regex_allowed ? read_regexp() : read_operator("/");
  };

  function handle_dot() {
    next();
    return is_digit(peek())
      ? read_num(".")
      : token("punc", ".");
  };

  function read_word() {
    var word = read_while(is_identifier_char);
    return !HOP(KEYWORDS, word)
      ? token("name", word)
      : HOP(OPERATORS, word)
      ? token("operator", word)
      : HOP(KEYWORDS_ATOM, word)
      ? token("atom", word)
      : token("keyword", word);
  };

  function with_eof_error(eof_error, cont) {
    try {
      return cont();
    } catch(ex) {
      if (ex === EX_EOF) parse_error(eof_error);
      else throw ex;
    }
  };

  function next_token(force_regexp) {
    if (S.queued_tokens.length)
      return S.queued_tokens.shift();
    if (force_regexp)
      return read_regexp();
    skip_whitespace();
    start_token();
    var ch = peek();
    if (!ch) return token("eof");
    if (is_digit(ch)) return read_num();
    if (ch === '"' || ch === "'") return read_string();
    if (HOP(PUNC_CHARS, ch)) return token("punc", next());
    if (ch === ".") return handle_dot();
    if (ch === "/") return handle_slash();
    if (ch === "#") {
      var regex_allowed = S.regex_allowed;
      S.comments_before.push(read_line_comment());
      S.regex_allowed = regex_allowed;
      return next_token();
    }
    // filter "^" into "function"
    if (ch === "^") {
      next(); // pop "^"
      ch = peek();
      if (ch === '{') {
        // short form w/o arguments, i.e. "^{..." -> "function () {..."
        S.queued_tokens.push(token('punc', '('));
        S.queued_tokens.push(token('punc', ')'));
      }
      return token("keyword", 'function');
    }
    if (HOP(OPERATOR_CHARS, ch)) return read_operator();
    if (ch === '@') {
      next(); // pop "@"
      var word = read_word();
      var thistok = token('name', 'this');
      thistok.nlb = word.nlb;
      word.nlb = false;
      //if (peek() !== '[') // TODO: fix "@['key']"
        S.queued_tokens.push(token('punc', '.'));
      S.queued_tokens.push(word);
      return thistok;
    }
    if (is_identifier_char(ch)) return read_word();
    parse_error("Unexpected character '" + ch + "'");
  };

  next_token.context = function(nc) {
    if (nc) S = nc;
    return S;
  };

  return next_token;

};

/* -----[ Parser (constants) ]----- */

var UNARY_PREFIX = array_to_hash([
  "typeof",
  "void",
  "delete",
  "--",
  "++",
  "!",
  "~",
  "-",
  "+"
]);

var UNARY_POSTFIX = array_to_hash([ "--", "++" ]);

var ASSIGNMENT = (function(a, ret, i){
  while (i < a.length) {
    ret[a[i]] = a[i].substr(0, a[i].length - 1);
    i++;
  }
  return ret;
})(
  ["+=", "-=", "/=", "*=", "%=", ">>=", "<<=", ">>>=", "|=", "xor=", "&="],
  { "=": true },
  0
);

var PRECEDENCE = (function(a, ret){
  for (var i = 0, n = 1; i < a.length; ++i, ++n) {
    var b = a[i];
    for (var j = 0; j < b.length; ++j) {
      ret[b[j]] = n;
    }
  }
  return ret;
})(
  [
    ["||"],
    ["&&"],
    ["|"],
    ["xor"],
    ["&"],
    ["==", "===", "!=", "!=="],
    ["<", ">", "<=", ">=", "in", "instanceof"],
    [">>", "<<", ">>>"],
    ["+", "-"],
    ["*", "/", "%"]
  ],
  {}
);

var STATEMENTS_WITH_LABELS = array_to_hash([ "for", "do", "while", "switch" ]);

var ATOMIC_START_TOKEN = array_to_hash([ "atom", "num", "string", "regexp", "name" ]);

/* -----[ Parser ]----- */

function NodeWithToken(str, start, end) {
  this.name = str;
  this.start = start;
  this.end = end;
};

NodeWithToken.prototype.toString = function() { return this.name; };

/*var TokenInputBuffer = function (tokenizerOrText, tokenizerOptions) {
  if (typeof tokenizerOrText === "string")
    tokenizerOrText = tokenizer(tokenizerOrText, tokenizerOptions);
  var tib = function TokenInputBuffer_(forceRegExp) { return tib.pop(forceRegExp); };
  tokenStream = tokenizerOrText;
  buffer = []; // beginning = next to pop ("pop left")
  tib.pop = function (forceRegExp) {
    if (buffer.length === 0) {
      return tokenStream(forceRegExp);
    } else {
      return buffer.shift();
    }
  };
  tib.push = function (token) {
    buffer.push(token);
  };
  tib.peek = function (futureOffset) {
    if (futureOffset === undefined) futureOffset = 1;
    var i, n = futureOffset;
    if (buffer.length < futureOffset) {
      i = futureOffset - buffer.length;
      while (i--) {
        buffer.push(tokenStream());
      }
    }
    return buffer[futureOffset-1];
  }
  return tib;
};*/

function parse($TEXT, strict_mode, embed_tokens) {
  var options = {};
  if (typeof strict_mode === 'object') {
    options = strict_mode;
    strict_mode = options.strictMode;
    embed_tokens = options.embedTokens;
  }

  var S = {
    //input   : TokenInputBuffer($TEXT, options),
    input   : typeof $TEXT == "string" ? tokenizer($TEXT, options) : $TEXT,
    token   : null,
    prev  : null,
    peeked  : null,
    in_function : 0,
    in_loop   : 0,
    labels  : []
  };

  S.token = next();

  function is(type, value) {
    return is_token(S.token, type, value);
  };

  function peek() { return S.peeked || (S.peeked = S.input()); };
  function peek2() {
    if (S.peeked2) return S.peeked2;
    peek();
    return (S.peeked2 = S.input());
  };

  function next() {
    S.prev = S.token;
    if (S.peeked) {
      S.token = S.peeked;
      if (S.peeked2) {
        S.peeked = S.peeked2;
        S.peeked2 = null;
      } else {
        S.peeked = null;
      }
    } else {
      S.token = S.input();
    }
    return S.token;
  };

  function prev() {
    return S.prev;
  };

  function croak(msg, line, col, pos) {
    var ctx = S.input.context();
    js_error(msg,
       line != null ? line : ctx.tokline,
       col != null ? col : ctx.tokcol,
       pos != null ? pos : ctx.tokpos);
  };

  function token_error(token, msg) {
    croak(msg, token.line, token.col);
  };

  function unexpected(token) {
    if (token == null)
      token = S.token;
    token_error(token, "Unexpected token: " + token.type + " " + JSON.stringify(token.value));
  };

  function expect_token(type, val) {
    if (is(type, val)) {
      return next();
    }
    token_error(S.token, "Unexpected token: " + S.token.type + ", expected " + type);
  };

  function expect_token2(type1, val1, type2, val2) {
    if (is(type1, val1) || is(type2, val2)) {
      return next();
    }
    token_error(S.token, "Unexpected token: " + S.token.type +
                ", expected " + type1 + " or " + type2);
  };

  function expect(punc) { return expect_token("punc", punc); };
  function expect2(punc1, punc2) {
    return expect_token2("punc", punc1, "punc", punc2);
  };

  function can_insert_semicolon() {
    return !strict_mode && (
      S.token.nlb || is("eof") || is("punc", "}")
    );
  };

  function semicolon() {
    if (is("punc", ";")) next();
    else if (!can_insert_semicolon()) unexpected();
  };

  function as() {
    return slice(arguments);
  };

  function parenthesised() {
    expect("(");
    var ex = expression();
    expect(")");
    return ex;
  };

  function add_tokens(str, start, end) {
    return str instanceof NodeWithToken ? str : new NodeWithToken(str, start, end);
  };

  var statement = embed_tokens ? function() {
    var start = S.token;
    var ast = $statement.apply(this, arguments);
    ast[0] = add_tokens(ast[0], start, prev());
    return ast;
  } : $statement;

  function $statement() {
    if (is("operator", "/")) {
      if (S.peeked2) {
        S.token = S.peeked2;
        S.peeked2 = null;
      } else {
        S.token = S.input(true); // force regexp
      }
      S.peeked = null;
    }
    //console.log('S.token ->', S.token)

    // "var" keyword is not allowed when automatic variable declaration is enabled
    if (options.automaticVarDeclarations && S.token.type === 'keyword' &&
        S.token.value === 'var') {
      unexpected();
    }

    switch (S.token.type) {
      case "num":
      case "string":
      case "regexp":
      case "operator":
      case "atom":
      return simple_statement();

      case "name":
      return is_token(peek(), "punc", ":")
        ? labeled_statement(prog1(S.token.value, next, next))
        : simple_statement();

      case "punc":
      switch (S.token.value) {
        case "{":
        return as("block", block_());
        case "[":
        case "(":
        return simple_statement();
        case ";":
        next();
        return as("block");
        default:
        unexpected();
      }

      case "keyword":
      switch (prog1(S.token.value, next)) {
        case "break":
        return break_cont("break");

        case "continue":
        return break_cont("continue");

        case "debugger":
        semicolon();
        return as("debugger");

        case "do":
        return (function(body){
          expect_token("keyword", "while");
          return as("do", prog1(parenthesised, semicolon), body);
        })(in_loop(statement));

        case "for":
        return for_();

        case "function":
        return function_(true);

        case "if":
        return if_();

        case "return":
        if (S.in_function == 0)
          croak("'return' outside of function");
        return as("return",
             is("punc", ";")
             ? (next(), null) : can_insert_semicolon()
             ? null : prog1(expression, semicolon));

        case "switch":
        return as("switch", parenthesised(), switch_block_());

        case "throw":
        return as("throw", prog1(expression, semicolon));

        case "try":
        return try_();

        case "var":
          return prog1(var_, semicolon);

        case "const":
        return prog1(const_, semicolon);

        case "while":
        return as("while", parenthesised(), in_loop(statement));

        case "with":
        //return as("with", parenthesised(), statement());
        croak("'with' statement not allowed");

        case "import":
        return prog1(import_, semicolon);

        case "export":
        return prog1(export_, semicolon);

        default:
        unexpected();
      }
    }
  };

  function labeled_statement(label) {
    S.labels.push(label);
    var start = S.token, stat = statement();
    if (strict_mode && !HOP(STATEMENTS_WITH_LABELS, stat[0]))
      unexpected(start);
    S.labels.pop();
    return as("label", label, stat);
  };

  function simple_statement() {
    return as("stat", prog1(expression, semicolon));
  };

  function break_cont(type) {
    var name = is("name") ? S.token.value : null;
    if (name != null) {
      next();
      if (!member(name, S.labels))
        croak("Label " + name + " without matching loop or statement");
    }
    else if (S.in_loop == 0)
      croak(type + " not inside a loop or switch");
    semicolon();
    return as(type, name);
  };

  function for_() {
    var expectParenthesis = false;
    if (expectParenthesis = is('punc', '(')) { next(); }

    var has_var = !options.automaticVarDeclarations && is("keyword", "var");
    if (has_var)
      next();
    if (is("name") && is_token(peek(), "operator", "in")) {
      // for (i in foo)
      var name = S.token.value;
      next(); next();
      var obj = expression(false, /*allow_calls=*/expectParenthesis);
      if (expectParenthesis) { expect(")"); }
      return as("for-in", has_var, name, obj, in_loop(statement));
    } else {
      // classic for
      var init = is("punc", ";") ? null : has_var ? var_() : expression();
      expect(";");
      var test = is("punc", ";") ? null : expression();
      expect(";");
      var step;
      if (expectParenthesis) {
        step = is("punc", ")") ? null : expression();
        expect(")");
      } else {
        step = is("punc", "{") ? null
             : expression(false, /*allow_calls=*/false, /*no_objects=*/true);
      }
      return as("for", init, test, step, in_loop(statement));
    }
  };

  var function_ = embed_tokens ? function() {
    var start = prev();
    var ast = $function_.apply(this, arguments);
    ast[0] = add_tokens(ast[0], start, prev());
    return ast;
  } : $function_;

  function $function_(in_statement) {
    var name = is("name") ? prog1(S.token.value, next) : null;
    if (in_statement && !name && !S.in_function) {
      unexpected();
    }
    expect("(");
    var args = object_args_();
    return as(in_statement ? "defun" : "function",
      name,
      // arguments
      args.names,
      // body
      (function(){
        ++S.in_function;
        var loop = S.in_loop;
        S.in_loop = 0;
        var a = block_();
        --S.in_function;
        S.in_loop = loop;
        return a;
      })(),
      // default argument values
      args.values
    );
  };

  /*function $function_(in_statement) {
    var name = is("name") ? prog1(S.token.value, next) : null;
    if (in_statement && !name)
      unexpected();
    expect("(");
    return as(in_statement ? "defun" : "function",
        name,
        // arguments
        (function(first, a){
          while (!is("punc", ")")) {
            if (first) first = false; else expect(",");
            if (!is("name")) unexpected();
            a.push(S.token.value);
            next();
          }
          next();
          return a;
        })(true, []),
        // body
        (function(){
          ++S.in_function;
          var loop = S.in_loop;
          S.in_loop = 0;
          var a = block_();
          --S.in_function;
          S.in_loop = loop;
          return a;
        })());
  };*/

  function if_() {
    var cond = parenthesised(), body = statement(), belse;
    if (is("keyword", "else")) {
      next();
      belse = statement();
    }
    return as("if", cond, body, belse);
  };

  function block_() {
    expect("{");
    var a = [];
    while (!is("punc", "}")) {
      if (is("eof")) unexpected();
      a.push(statement());
    }
    next();
    return a;
  };

  var switch_block_ = curry(in_loop, function(){
    expect("{");
    var a = [], cur = null;
    while (!is("punc", "}")) {
      if (is("eof")) unexpected();
      if (is("keyword", "case")) {
        next();
        cur = [];
        a.push([ expression(), cur ]);
        expect(":");
      }
      else if (is("keyword", "default")) {
        next();
        expect(":");
        cur = [];
        a.push([ null, cur ]);
      }
      else {
        if (!cur) unexpected();
        cur.push(statement());
      }
    }
    next();
    return a;
  });

  function try_() {
    var body = block_(), bcatch, bfinally;
    if (is("keyword", "catch")) {
      next();
      expect("(");
      if (!is("name"))
        croak("Name expected");
      var name = S.token.value;
      next();
      expect(")");
      bcatch = [ name, block_() ];
    }
    if (is("keyword", "finally")) {
      next();
      bfinally = block_();
    }
    if (!bcatch && !bfinally)
      croak("Missing catch/finally blocks");
    return as("try", body, bcatch, bfinally);
  };

  function vardefs() {
    var a = [];
    for (;;) {
      if (!is("name"))
        unexpected();
      var name = S.token.value;
      next();
      if (is("operator", "=")) {
        next();
        a.push([ name, expression(false) ]);
      } else {
        a.push([ name ]);
      }
      if (!is("punc", ","))
        break;
      next();
    }
    return a;
  };

  function importdefs() {
    var a = [], relPathDepth = 0, name, symbolName, path, n;
    for (;;) {
      // Zero or more "."
      relPathDepth = 0;
      while (S.token.value === '.') {
        ++relPathDepth;
        next();
      }
      // A symbol name
      if (!is("name"))
        unexpected();

      name = [S.token.value];
      next();

      // "foo/bar/baz" -> ["foo", "bar", "baz"]
      while (S.token.value === '/') {
        next();
        if (!is("name"))
          unexpected();
        name.push(S.token.value);
        next();
      }
      
      symbolName = name[name.length-1];
      path = name.join('/');
      
      // Optional explicit value
      if (relPathDepth) {
        if (relPathDepth === 1) {
          path = './'+path;
        } else {
          n = relPathDepth-1;
          while (n--) path = '../' + path;
        }
        a.push([ symbolName, ["string", path] ]);
      } else if (is("operator", "=")) {
        next();
        a.push([ symbolName, expression(false) ]);
      } else {
        a.push([ symbolName, ["string", path] ]);
      }
      if (!is("punc", ","))
        break;
      next();
    }
    return a;
  };

  function var_() {
    return as("var", vardefs());
  };

  function const_() {
    return as("const", vardefs());
  };

  function import_() {
    return as("import", importdefs());
  };

  function export_() {
    return as("export", vardefs());
  };

  function new_() {
    var newexp = expr_atom(false), args;
    if (is("punc", "(")) {
      next();
      args = expr_list(")");
    } else {
      args = [];
    }
    return subscripts(as("new", newexp, args), true);
  };

  function expr_atom(allow_calls, no_objects) {
    if (is("operator", "new")) {
      next();
      return new_();
    }
    if (is("operator") && HOP(UNARY_PREFIX, S.token.value)) {
      return make_unary("unary-prefix",
            prog1(S.token.value, next),
            expr_atom(allow_calls, no_objects));
    }
    if (is("punc") /*&& (!no_objects || S.token.value !== '{')*/) {
      switch (S.token.value) {
        case "(":
        next();
        return subscripts(prog1(expression(false, allow_calls, no_objects), curry(expect, ")")), allow_calls);
        case "[":
        next();
        return subscripts(array_(), allow_calls, no_objects);
        case "{":
        next();
        return subscripts(object_(), allow_calls, no_objects);
      }
      unexpected();
    }
    if (is("keyword", "function")) {
      next();
      return subscripts(function_(false), allow_calls);
    }
    if (HOP(ATOMIC_START_TOKEN, S.token.type)) {
      var atom = S.token.type == "regexp"
        ? as("regexp", S.token.value[0], S.token.value[1])
        : as(S.token.type, S.token.value);
      return subscripts(prog1(atom, next), allow_calls, no_objects);
    }
    unexpected();
  };

  function expr_list(closing, allow_trailing_comma, allow_empty) {
    var first = true, a = [];
    while (!is("punc", closing)) {
      if (first) first = false; else expect(",");
      if (allow_trailing_comma && is("punc", closing)) break;
      if (is("punc", ",") && allow_empty) {
        a.push([ "atom", "undefined" ]);
      } else {
        a.push(expression(false));
      }
    }
    next();
    return a;
  };

  function expr_list_v(closing, allow_trailing_comma, allow_empty, maxcount) {
    var first = true, a = [];
    if (!maxcount) maxcount = 0xffffffffffffffff
    try {
      while (!is("punc", closing) && --maxcount) {
        if (first) first = false; else expect(",");
        if (allow_trailing_comma && is("punc", closing)) break;
        if (is("punc", ",") && allow_empty) {
          a.push([ "atom", "undefined" ]);
        } else {
          a.push(expression(false));
        }
      }
      next();
    } catch(e) {
      // "Unexpected token" error terminates the list
      if (String(e.message).indexOf('Unexpected token') !== 0)
        throw e;
    }
    return a;
  };

  function array_() {
    return as("array", expr_list("]", !strict_mode, true));
  };

  function object_() {
    var first = true, a = [];
    while (!is("punc", "}")) {
      if (first) first = false; else expect(",");
      if (!strict_mode && is("punc", "}"))
        // allow trailing comma
        break;
      var type = S.token.type;
      var name = as_property_name();
      if (type == "name" && (name == "get" || name == "set") && !is("punc", ":")) {
        a.push([ as_name(), function_(false), name ]);
      } else {
        expect(":");
        a.push([ name, expression(false) ]);
      }
    }
    next();
    return as("object", a);
  };

  function object_args_() {
    var first = true, type, name, names = [], values = {};
    while (!is("punc", ")")) {
      if (first) first = false; else expect(",");
      if (!strict_mode && is("punc", ")")) {
        // allow trailing comma
        break;
      }
      type = S.token.type;
      name = as_property_name();
      names.push(name);
      // Allows for specifying default value using either : or =
      if (is("punc", ":") /*|| is("operator", "=")*/) {
        next();
        values[name] = expression(false);
      } else {
        values[name] = undefined;
      }
    }
    next();
    return {names:names, values:values};
  };

  function as_property_name() {
    switch (S.token.type) {
      case "num":
      case "string":
      return prog1(S.token.value, next);
    }
    return as_name();
  };

  function as_name() {
    switch (S.token.type) {
      case "name":
      case "operator":
      case "keyword":
      case "atom":
      return prog1(S.token.value, next);
      default:
      unexpected();
    }
  };

  function _slice(expr, leftExpr, rightExpr, allow_calls) {
    if (is("operator", "=")) {
      // write slice (e.g. "y[1:2] = x")
      next(); // skip the "="
      var value = statement(); // read the right-hand-side (source) statement

      // Convert slice-write notation into calls to:
      // _move_setSlice(startIndex, endIndex=@length, value)
      return subscripts(['call', ['dot', expr, '_move_setSlice'], [
        leftExpr || ['num', '0'],
        rightExpr || ['name', 'undefined'],
        value[1] || ['name', 'undefined']
      ]], allow_calls);
    } else {
      // read slice (e.g. "x = y[1:2]")

      // This block "converts" slice notation into calls to a "slice" method
      var args = [leftExpr || ['num', '0']];
      if (rightExpr) args.push(rightExpr);
      return subscripts(['call', ['dot', expr, 'slice'], args], allow_calls);

      // This code can be used instead of the above lines to output a "slice"
      // AST node/branch:
      /*if (rightExpr) {
        return subscripts(as("slice", expr, leftExpr, rightExpr), allow_calls);
      } else if (leftExpr) {
        return subscripts(as("slice", expr, leftExpr), allow_calls);
      } else {
        return subscripts(as("slice", expr), allow_calls);
      }*/
    }
  }

  function subscripts(expr, allow_calls, no_objects) {
    if (is("punc", ".")) {
      next();
      return subscripts(as("dot", expr, as_name()), allow_calls, no_objects);
    }
    if (is("punc", "[")) {

      if (S.token.nlb /*&& expr[0] === 'sub'*/) {
        // Fix for issue #9
        // The previous line ended with a subscript ...] and the current line
        // starts with a subscript [... -- don't walk further but unroll current
        // branch (the previous line's ...]), causing the current line to form
        // a new branch, separating the different subscript accesses.
        return expr;
      }

      next();
      var leftExpr = null, rightExpr = null;
      if (is('punc', ':')) {
        // we are dealing with a [:y] slice
        next();
      } else {
        // read left expression
        leftExpr = prog1(expression(false, allow_calls, no_objects), curry(expect2, "]", ":"));
      }
      if (S.prev.value === ':') {
        // We are dealing with a [x:y] slice
        if (is('punc', ']')) {
          // [x:]
          next(); // skip past the terminating "]"
        } else {
          // [x:y]
          rightExpr = prog1(expression(false, allow_calls, no_objects), curry(expect, "]"));
        }
        return _slice(expr, leftExpr, rightExpr, allow_calls);
      } else {
        // we are dealing with a subscript
        return subscripts(as("sub", expr, leftExpr), allow_calls, no_objects);
      }
    }
    if (allow_calls && is("punc", "(")) {
      if (S.token.nlb) {
        // Fixes this case:
        //    foo bar
        //    (x) && x()
        // Which otherwise parse as "foo(bar(x) && x())"
        return expr;
      }
      /*
       [ 'call',
         [ 'name', 'foo' ],
         [ [ 'string', 'value1' ], [ 'string', 'value2' ] ] ]
      */
      next();
      return subscripts(as("call", expr, expr_list(")")), allow_calls, no_objects);
    }
    if (allow_calls && !no_objects && options.keywordArguments && is("punc", "{")) {
      if (S.token.nlb) {
        // Fixes this case:
        //    foo bar
        //    {x:1} && x()
        // Which otherwise parse as "foo(bar(x) && x())"
        return expr;
      }
      next();
      var kwargs;

      // "foo {&kwargs}" call style for passing keyword args
      if (is("operator", "&")) {
        next();
        kwargs = expression(false, allow_calls, no_objects);
        expect("}");
        if (!options.raw) {
          // wrap in
          kwargs = ['call', ['name', '_MoveKWArgsT'], [kwargs]];
        }
      } else {
        kwargs = object_();
        kwargs[1].push(['__kw', ['name', '__Move_KWArgs__']]);
      }

      var nameExpr = expr;
      //console.log('kwargs', require('util').inspect(kwargs, 0, 10))
      return subscripts(as("call", nameExpr, [kwargs]), allow_calls, no_objects);
    }
    /*if (allow_calls && is("operator", "!")) {
      next();
      var subexprs = expr_list_v(";");
      return subscripts(as("call", expr, subexprs), true);
    }*/
    /*if (allow_calls && is("punc", ":")) {
    //if (allow_calls && is("operator", "!")) {
      next();
      var subexprs = expr_list_v(";");
      return subscripts(as("call", expr, subexprs), true);
    }*/
    if (allow_calls && is("operator") && HOP(UNARY_POSTFIX, S.token.value)) {
      if (S.token.nlb) {
        // Fixes this case:
        //   foo = bar<LF>
        //   ++x
        // Which otherwise parse as "foo = bar++x" and causes a parse error
        return expr;
      }
      return prog1(curry(make_unary, "unary-postfix", S.token.value, expr),
           next);
    }
    // shorthand "foo arg" style function invocation
    if (allow_calls && !is("eof") && !is("punc") && !is("operator")
        && (S.token.type !== "keyword" || S.token.value === "function")
       ) {
      // Use this line to allow only single argument
      //var subexprs = [expression(false)];

      if (S.token.nlb) {
        // Fixes this case:
        //    foo bar
        //    {x:1} && x()
        // Which otherwise parse as "foo(bar(x) && x())"
        return expr;
      }

      // Use the following try-clause to allow multiple arguments. However, be
      // aware that by allowing arbitrary long arguments in short-hand form,
      // syntax become somewhat ambiguous. This expression:
      //    assert.equal(foo foo foo "Hello", "Hello")
      // translates to:
      //    assert.equal(foo(foo(foo("Hello"), "Hello")))
      // while most people would expect it to translate into:
      //    assert.equal(foo(foo(foo("Hello"))), "Hello")
      // which is the case when only consuming a single argument.
      //
      var subexprs = [], first = true, aborted, p1, p2;
      //try {
      while (!is("punc", ';')) {
        if (first) {
          first = false;
        } else if (is("punc", ",")) {

          p1 = peek();
          if (p1.type === 'name' &&
              (!(p2 = peek2()) || (p2.type === 'punc' && p2.value === ':'))) {
            // Special case:
            // { foo: 'arg1', 'arg2',
            //   <terminate foo args>
            //   bar: 2,
            // }
            aborted = true;
            break;
          }

          if (p1.type === 'punc' && p1.value === '}') {
            // Special case:
            // { foo: 1,
            //   bar: 2,
            // }
            // ^
            aborted = true;
            break;
          }

          next();
        } else {
          aborted = true;
          break;
        }
        subexprs.push(expression(false, allow_calls, no_objects));
      }
      if (!aborted && !is("punc", ';')) {
        next();
      }
      /*} catch(e) {
        // "Unexpected token" error terminates the list
        if (String(e.message).indexOf('Unexpected token') !== 0)
          throw e;
      }*/
      //console.log('END', S.token)
      if (S.token.nlb || is("punc", ';'))
        return as("call", expr, subexprs);

      return subscripts(as("call", expr, subexprs), true, no_objects);
    }
    return expr;
  };

  function make_unary(tag, op, expr) {
    if ((op == "++" || op == "--") && !is_assignable(expr))
      croak("Invalid use of " + op + " operator");
    return as(tag, op, expr);
  };

  function expr_op(left, min_prec, allow_calls, no_objects) {
    var op = is("operator") ? S.token.value : null;
    var prec = op != null ? PRECEDENCE[op] : null;
    if (allow_calls === undefined) allow_calls = true;
    if (prec != null && prec > min_prec) {
      next();
      var right = expr_op(expr_atom(allow_calls, no_objects), prec, allow_calls, no_objects);
      return expr_op(as("binary", op, left, right), min_prec, allow_calls, no_objects);
    }
    return left;
  };

  function expr_ops(allow_calls, no_objects) {
    if (allow_calls === undefined) allow_calls = true;
    return expr_op(expr_atom(allow_calls, no_objects), 0, allow_calls, no_objects);
  };

  function maybe_conditional(allow_calls, no_objects) {
    var expr = expr_ops(allow_calls, no_objects);
    if (is("operator", "?")) {
      next();
      var yes = expression(false, allow_calls, no_objects);
      expect(":");
      return as("conditional", expr, yes, expression(false, allow_calls, no_objects));
    }
    return expr;
  };

  function is_assignable(expr) {
    switch (expr[0]) {
      case "dot":
      case "sub":
      return true;
      case "name":
      return expr[1] != "this";
    }
  };

  function maybe_assign(allow_calls, no_objects) {
    var left = maybe_conditional(allow_calls, no_objects), val = S.token.value;
    if (is("operator") && HOP(ASSIGNMENT, val)) {
      if (is_assignable(left)) {
        next();
        return as("assign", ASSIGNMENT[val], left, maybe_assign());
      }
      croak("Invalid assignment");
    }
    return left;
  };

  function expression(commas, allow_calls, no_objects) {
    if (arguments.length == 0)
      commas = true;
    var expr = maybe_assign(allow_calls, no_objects);
    if (commas && is("punc", ",")) {
      next();
      return as("seq", expr, expression());
    }
    return expr;
  };

  function in_loop(cont) {
    try {
      ++S.in_loop;
      return cont();
    } finally {
      --S.in_loop;
    }
  };

  return as("toplevel", (function(a){
    while (!is("eof"))
      a.push(statement());
    return a;
  })([]));

};

/* -----[ Utilities ]----- */

function curry(f) {
  var args = slice(arguments, 1);
  return function() { return f.apply(this, args.concat(slice(arguments))); };
};

function prog1(ret) {
  if (ret instanceof Function)
    ret = ret();
  for (var i = 1, n = arguments.length; --n > 0; ++i)
    arguments[i]();
  return ret;
};

function array_to_hash(a) {
  var ret = {};
  for (var i = 0; i < a.length; ++i)
    ret[a[i]] = true;
  return ret;
};

function slice(a, start) {
  return Array.prototype.slice.call(a, start == null ? 0 : start);
};

function characters(str) {
  return str.split("");
};

function member(name, array) {
  for (var i = array.length; --i >= 0;)
    if (array[i] === name)
      return true;
  return false;
};

function HOP(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
};

/* -----[ Exports ]----- */

exports.tokenizer = tokenizer;
exports.parse = parse;
exports.slice = slice;
exports.curry = curry;
exports.member = member;
exports.array_to_hash = array_to_hash;
exports.PRECEDENCE = PRECEDENCE;
exports.KEYWORDS_ATOM = KEYWORDS_ATOM;
exports.RESERVED_WORDS = RESERVED_WORDS;
exports.KEYWORDS = KEYWORDS;
exports.ATOMIC_START_TOKEN = ATOMIC_START_TOKEN;
exports.OPERATORS = OPERATORS;
exports.is_alphanumeric_char = is_alphanumeric_char;
exports.is_identifier_char = is_identifier_char;
});
_require.define("compiler/preprocessors/ehtml","compiler/preprocessors/ehtml.mv",function(require, module, exports, __filename, __dirname){(function(){"use strict";
  var M, _MoveKWArgsT, Text, extend, create, print, repeat, after, JSON, __class, EventEmitter, process;
  M = Move.runtime, _MoveKWArgsT = M._MoveKWArgsT, Text = M.Text, extend = M.extend, create = M.create, print = M.print, repeat = M.repeat, after = M.after, JSON = M.JSON, __class = M.__class, EventEmitter = M.EventEmitter;
  exports.process = process = function process(src, options) {
    src !== null && typeof src === "object" && src.__kw === _MoveKWArgsT && (arguments.keywords = src, options = src.options, src = src.src);
    var i, skipString, readEHTMLNode, parseAny, output, moduleName;
    i = 0;
    skipString = function skipString(endch) {
      endch !== null && typeof endch === "object" && endch.__kw === _MoveKWArgsT && (arguments.keywords = endch, endch = endch.endch);
      var prevCh, ch;
      prevCh = null;
      while (ch = src[i++]) {
        if (ch === endch && prevCh !== "\\") break;
        prevCh = ch;
      }
    };
    readEHTMLNode = function readEHTMLNode() {
      var stackDepth, start, ch, ranges, firstCh, prevCh, buf, ehtml;
      stackDepth = 0;
      start = i - 1;
      ch = "<";
      ranges = [];
      while (ch === "<") {
        firstCh = prevCh = null;
        while ((ch = src[i++]) && ch !== ">") {
          if (firstCh === null) firstCh = ch;
          if (ch === "{" && prevCh !== "\\") {
            ranges.push([ true, start, i - 1 ]);
            start = i;
            buf = parseAny(true);
            ranges.push([ false, buf ]);
            start = i;
          }
          prevCh = ch;
        }
        if (firstCh === "/") {
          --stackDepth;
          if (stackDepth < 0) throw Error("EHTML: Premature termination");
        } else if (prevCh === "/") {} else {
          ++stackDepth;
        }
        if (!ch || stackDepth === 0) break;
        while ((ch = src[i++]) && ch !== "<") {
          if (ch === "{" && prevCh !== "\\") {
            ranges.push([ true, start, i - 1 ]);
            start = i;
            buf = parseAny(true);
            ranges.push([ false, buf ]);
            start = i;
          }
          prevCh = ch;
        }
      }
      ranges.push([ true, start, i ]);
      ehtml = "";
      ranges.forEach(function (range) {
        range !== null && typeof range === "object" && range.__kw === _MoveKWArgsT && (arguments.keywords = range, range = range.range);
        var s;
        if (range[0]) {
          s = src.substring(range[1], range[2]);
          s = s.replace(/\n/g, "\\n");
          s = s.replace(/\t/g, "\\t");
          s = s.replace(/'/g, "\\'");
        } else {
          s = "'+(" + range[1] + ")+'";
        }
        return ehtml += s;
      });
      ehtml = "EHTML('" + ehtml + "')";
      return ehtml;
    };
    parseAny = function parseAny(isDeep) {
      isDeep !== null && typeof isDeep === "object" && isDeep.__kw === _MoveKWArgsT && (arguments.keywords = isDeep, isDeep = isDeep.isDeep);
      var output, STATE_EHTML, STATE_LT, state, prevCh, deepDepth, ch, checkState, p;
      output = "";
      STATE_EHTML = 0;
      STATE_LT = 1;
      state = STATE_EHTML;
      prevCh = null;
      deepDepth = 1;
      while (ch = src[i++]) {
        checkState = false;
        switch (ch) {
         case " ":
         case "\n":
         case "\r":
         case "\t":
          output += ch;
          break;
         case '"':
          p = i;
          skipString('"');
          output += src.substring(p - 1, i);
          break;
         case "'":
          p = i;
          skipString("'");
          output += src.substring(p - 1, i);
          break;
         case "<":
          if (state === STATE_LT) {
            state = STATE_EHTML;
            output += ch;
          } else {
            output += readEHTMLNode();
          }
          break;
         default:
          output += ch;
          checkState = true;
        }
        if (checkState) {
          if (isDeep && prevCh !== "\\") {
            if (ch === "{") {
              ++deepDepth;
            } else if (ch === "}") {
              if (--deepDepth === 0) {
                output = output.substr(0, output.length - 1);
                break;
              }
            }
          }
          if (ch.match(/[a-z0-9_\)\}]/i)) {
            state = STATE_LT;
          } else {
            state = STATE_EHTML;
          }
        }
        prevCh = ch;
      }
      return output;
    };
    output = parseAny();
    if (!options.ehtmlDisableImplicitViewConstructor) {
      if (output.match(/(exports\.createView|export\s+createView)\s*[=\r\n]/)) {
        moduleName = Move.filenameToModuleId(options.filename).split("/").slice(-1)[0].replace(".", "_");
        output = "exports = module.exports = " + moduleName + " = ^{" + " EHTML.createViewImpl.apply exports, arguments };" + 'exports.__domid = module.id.replace("/", "_");' + output;
      }
    }
    return output = "EHTML = Move.EHTML\n" + output;
  };
})();});
_require.define("compiler/process","compiler/process.js",function(require, module, exports, __filename, __dirname){/***********************************************************************

  A JavaScript tokenizer / parser / beautifier / compressor.

  This version is suitable for Node.js.  With minimal changes (the
  exports stuff) it should work on any JS platform.

  This file implements some AST processors.  They work on data built
  by parse-js.

  Exported functions:

    - ast_mangle(ast, include_toplevel) -- mangles the
      variable/function names in the AST.  Returns an AST.  Pass true
      as second argument to mangle toplevel names too.

    - ast_squeeze(ast) -- employs various optimizations to make the
      final generated code even smaller.  Returns an AST.

    - gen_code(ast, beautify) -- generates JS code from the AST.  Pass
      true (or an object, see the code for some options) as second
      argument to get "pretty" (indented) code.

  -------------------------------- (C) ---------------------------------

         Author: Mihai Bazon
       <mihai.bazon@gmail.com>
           http://mihai.bazon.net/blog

  Distributed under the BSD license:

    Copyright 2010 (c) Mihai Bazon <mihai.bazon@gmail.com>

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions
    are met:

  * Redistributions of source code must retain the above
    copyright notice, this list of conditions and the following
    disclaimer.

  * Redistributions in binary form must reproduce the above
    copyright notice, this list of conditions and the following
    disclaimer in the documentation and/or other materials
    provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDER “AS IS” AND ANY
    EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
    IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
    PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE
    LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
    OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
    PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
    PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
    THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
    TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
    THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
    SUCH DAMAGE.

 ***********************************************************************/

var jsp = require("./parser"),
    slice = jsp.slice,
    member = jsp.member,
    PRECEDENCE = jsp.PRECEDENCE,
    OPERATORS = jsp.OPERATORS;

/* -----[ helper for AST traversal ]----- */

function ast_walker(ast) {
  function _vardefs(defs) {
    return [ this[0], MAP(defs, function(def){
      var a = [ def[0] ];
      if (def.length > 1)
        a[1] = walk(def[1]);
      return a;
    }) ];
  };
  var walkers = {
    "string": function(str) {
      return [ this[0], str ];
    },
    "num": function(num) {
      return [ this[0], num ];
    },
    "name": function(name) {
      return [ this[0], name ];
    },
    "toplevel": function(statements) {
      return [ this[0], MAP(statements, walk) ];
    },
    "block": function(statements) {
      var out = [ this[0] ];
      if (statements != null)
        out.push(MAP(statements, walk));
      return out;
    },
    "var": _vardefs,
    "const": _vardefs,
    "import": _vardefs,
    "export": _vardefs,
    "try": function(t, c, f) {
      return [
        this[0],
        MAP(t, walk),
        c != null ? [ c[0], MAP(c[1], walk) ] : null,
        f != null ? MAP(f, walk) : null
      ];
    },
    "throw": function(expr) {
      return [ this[0], walk(expr) ];
    },
    "new": function(ctor, args) {
      return [ this[0], walk(ctor), MAP(args, walk) ];
    },
    "switch": function(expr, body) {
      return [ this[0], walk(expr), MAP(body, function(branch){
        return [ branch[0] ? walk(branch[0]) : null,
           MAP(branch[1], walk) ];
      }) ];
    },
    "break": function(label) {
      return [ this[0], label ];
    },
    "continue": function(label) {
      return [ this[0], label ];
    },
    "conditional": function(cond, t, e) {
      return [ this[0], walk(cond), walk(t), walk(e) ];
    },
    "assign": function(op, lvalue, rvalue) {
      return [ this[0], op, walk(lvalue), walk(rvalue) ];
    },
    "dot": function(expr) {
      return [ this[0], walk(expr) ].concat(slice(arguments, 1));
    },
    "call": function(expr, args) {
      return [ this[0], walk(expr), MAP(args, walk) ];
    },
    "function": function(name, args, body, kwargs) {
      return [ this[0], name, args.slice(), MAP(body, walk), kwargs ];
    },
    "defun": function(name, args, body, kwargs) {
      return [ this[0], name, args.slice(), MAP(body, walk), kwargs ];
    },
    "if": function(conditional, t, e) {
      return [ this[0], walk(conditional), walk(t), walk(e) ];
    },
    "for": function(init, cond, step, block) {
      return [ this[0], walk(init), walk(cond), walk(step), walk(block) ];
    },
    "for-in": function(vvar, key, hash, block) {
      if (vvar)
        return [ this[0], walk(vvar), walk(key), walk(hash), walk(block) ];
      else
        return [ this[0], vvar, key, walk(hash), walk(block) ];
    },
    "while": function(cond, block) {
      return [ this[0], walk(cond), walk(block) ];
    },
    "do": function(cond, block) {
      return [ this[0], walk(cond), walk(block) ];
    },
    "return": function(expr) {
      return [ this[0], walk(expr) ];
    },
    "binary": function(op, left, right) {
      return [ this[0], op, walk(left), walk(right) ];
    },
    "unary-prefix": function(op, expr) {
      return [ this[0], op, walk(expr) ];
    },
    "unary-postfix": function(op, expr) {
      return [ this[0], op, walk(expr) ];
    },
    "sub": function(expr, subscript) {
      return [ this[0], walk(expr), walk(subscript) ];
    },
    "object": function(props) {
      return [ this[0], MAP(props, function(p){
        return p.length === 2
          ? [ p[0], walk(p[1]) ]
          : [ p[0], walk(p[1]), p[2] ]; // get/set-ter
      }) ];
    },
    "regexp": function(rx, mods) {
      return [ this[0], rx, mods ];
    },
    "array": function(elements) {
      return [ this[0], MAP(elements, walk) ];
    },
    "stat": function(stat) {
      return [ this[0], walk(stat) ];
    },
    "seq": function() {
      return [ this[0] ].concat(MAP(slice(arguments), walk));
    },
    "label": function(name, block) {
      return [ this[0], name, walk(block) ];
    },
    "with": function(expr, block) {
      return [ this[0], walk(expr), walk(block) ];
    },
    "atom": function(name) {
      return [ this[0], name ];
    }
  };

  var user = {};
  var stack = [];
  function walk(ast) {
    if (!ast || ast.length === 0)
      return null;
    try {
      stack.push(ast);
      var type = ast[0];
      var gen = user[type];
      if (gen) {
        var ret = gen.apply(ast, ast.slice(1));
        if (ret != null)
          return ret;
      }
      gen = walkers[type];
      return gen.apply(ast, ast.slice(1));
    } finally {
      stack.pop();
    }
  };

  function with_walkers(walkers, cont){
    var save = {}, i;
    for (i in walkers) if (HOP(walkers, i)) {
      save[i] = user[i];
      user[i] = walkers[i];
    }
    var ret = cont();
    for (i in save) if (HOP(save, i)) {
      if (!save[i]) delete user[i];
      else user[i] = save[i];
    }
    return ret;
  };

  return {
    walk: walk,
    with_walkers: with_walkers,
    parent: function() {
      return stack[stack.length - 2]; // last one is current node
    },
    stack: function() {
      return stack;
    }
  };
};

/* -----[ Scope and mangling ]----- */

function Scope(parent) {
  this.names = {};  // names defined in this scope
  this.mangled = {};      // mangled names (orig.name => mangled)
  this.rev_mangled = {};  // reverse lookup (mangled => orig.name)
  this.cname = -1;  // current mangled name
  this.refs = {};   // names referenced from this scope
  this.uses_with = false; // will become TRUE if eval() is detected in this or any subscopes
  this.uses_eval = false; // will become TRUE if with() is detected in this or any subscopes
  this.parent = parent;   // parent scope
  this.children = [];     // sub-scopes
  if (parent) {
    this.level = parent.level + 1;
    parent.children.push(this);
  } else {
    this.level = 0;
  }
};

var base54 = (function(){
  var DIGITS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_";
  return function(num) {
    var ret = "";
    do {
      ret = DIGITS.charAt(num % 54) + ret;
      num = Math.floor(num / 54);
    } while (num > 0);
    return ret;
  };
})();

Scope.prototype = {
  has: function(name) {
    for (var s = this; s; s = s.parent)
      if (HOP(s.names, name))
        return s;
  },
  has_mangled: function(mname) {
    for (var s = this; s; s = s.parent)
      if (HOP(s.rev_mangled, mname))
        return s;
  },
  toJSON: function() {
    return {
      names: this.names,
      uses_eval: this.uses_eval,
      uses_with: this.uses_with
    };
  },

  next_mangled: function() {
    // we must be careful that the new mangled name:
    //
    // 1. doesn't shadow a mangled name from a parent
    //    scope, unless we don't reference the original
    //    name from this scope OR from any sub-scopes!
    //    This will get slow.
    //
    // 2. doesn't shadow an original name from a parent
    //    scope, in the event that the name is not mangled
    //    in the parent scope and we reference that name
    //    here OR IN ANY SUBSCOPES!
    //
    // 3. doesn't shadow a name that is referenced but not
    //    defined (possibly global defined elsewhere).
    for (;;) {
      var m = base54(++this.cname), prior;

      // case 1.
      prior = this.has_mangled(m);
      if (prior && this.refs[prior.rev_mangled[m]] === prior)
        continue;

      // case 2.
      prior = this.has(m);
      if (prior && prior !== this && this.refs[m] === prior && !prior.has_mangled(m))
        continue;

      // case 3.
      if (HOP(this.refs, m) && this.refs[m] == null)
        continue;

      // I got "do" once. :-/
      if (!is_identifier(m))
        continue;

      return m;
    }
  },
  get_mangled: function(name, newMangle) {
    if (this.uses_eval || this.uses_with) return name; // no mangle if eval or with is in use
    var s = this.has(name);
    if (!s) return name; // not in visible scope, no mangle
    if (HOP(s.mangled, name)) return s.mangled[name]; // already mangled in this scope
    if (!newMangle) return name;          // not found and no mangling requested

    var m = s.next_mangled();
    s.rev_mangled[m] = name;
    return s.mangled[name] = m;
  },
  define: function(name) {
    if (name != null)
      return this.names[name] = name;
  }
};

function ast_add_scope(ast) {

  var current_scope = null;
  var w = ast_walker(), walk = w.walk;
  var having_eval = [];

  function with_new_scope(cont) {
    current_scope = new Scope(current_scope);
    var ret = current_scope.body = cont();
    ret.scope = current_scope;
    current_scope = current_scope.parent;
    return ret;
  };

  function define(name) {
    return current_scope.define(name);
  };

  function reference(name) {
    current_scope.refs[name] = true;
  };

  function _lambda(name, args, body, kwargs) {
    return [ this[0], define(name), args, with_new_scope(function(){
      MAP(args, define);
      return MAP(body, walk);
    }), kwargs];
  };

  return with_new_scope(function(){
    // process AST
    var ret = w.with_walkers({
      "function": _lambda,
      "defun": _lambda,
      "with": function(expr, block) {
        for (var s = current_scope; s; s = s.parent)
          s.uses_with = true;
      },
      "var": function(defs) {
        MAP(defs, function(d){ define(d[0]) });
      },
      "const": function(defs) {
        MAP(defs, function(d){ define(d[0]) });
      },
      "try": function(t, c, f) {
        if (c != null) return [
          this[0],
          MAP(t, walk),
          [ define(c[0]), MAP(c[1], walk) ],
          f != null ? MAP(f, walk) : null
        ];
      },
      "name": function(name) {
        if (name === "eval")
          having_eval.push(current_scope);
        reference(name);
      },
      "for-in": function(has_var, name) {
        if (has_var) define(name);
        else reference(name);
      }
    }, function(){
      return walk(ast);
    });

    // the reason why we need an additional pass here is
    // that names can be used prior to their definition.

    // scopes where eval was detected and their parents
    // are marked with uses_eval, unless they define the
    // "eval" name.
    MAP(having_eval, function(scope){
      if (!scope.has("eval")) while (scope) {
        scope.uses_eval = true;
        scope = scope.parent;
      }
    });

    // for referenced names it might be useful to know
    // their origin scope.  current_scope here is the
    // toplevel one.
    function fixrefs(scope, i) {
      // do children first; order shouldn't matter
      for (i = scope.children.length; --i >= 0;)
        fixrefs(scope.children[i]);
      for (i in scope.refs) if (HOP(scope.refs, i)) {
        // find origin scope and propagate the reference to origin
        for (var origin = scope.has(i), s = scope; s; s = s.parent) {
          s.refs[i] = origin;
          if (s === origin) break;
        }
      }
    };
    fixrefs(current_scope);

    return ret;
  });

};

/* -----[ mangle names ]----- */

function ast_mangle(ast, do_toplevel) {
  var w = ast_walker(), walk = w.walk, scope;

  function get_mangled(name, newMangle) {
    if (!do_toplevel && !scope.parent) return name; // don't mangle toplevel
    return scope.get_mangled(name, newMangle);
  };

  function _lambda(name, args, body, kwargs) {
    if (name) name = get_mangled(name);
    body = with_scope(body.scope, function(){
      args = MAP(args, function(name){ return get_mangled(name) });
      return MAP(body, walk);
    });
    return [ this[0], name, args, body, kwargs ];
  };

  function with_scope(s, cont) {
    var _scope = scope;
    scope = s;
    for (var i in s.names) if (HOP(s.names, i)) {
      get_mangled(i, true);
    }
    var ret = cont();
    ret.scope = s;
    scope = _scope;
    return ret;
  };

  function _vardefs(defs) {
    return [ this[0], MAP(defs, function(d){
      return [ get_mangled(d[0]), walk(d[1]) ];
    }) ];
  };

  return w.with_walkers({
    "function": _lambda,
    "defun": function() {
      // move function declarations to the top when
      // they are not in some block.
      var ast = _lambda.apply(this, arguments);
      switch (w.parent()[0]) {
          case "toplevel":
          case "function":
          case "defun":
        return MAP.at_top(ast);
      }
      return ast;
    },
    "var": _vardefs,
    "const": _vardefs,
    "name": function(name) {
      return [ this[0], get_mangled(name) ];
    },
    "try": function(t, c, f) {
      return [ this[0],
         MAP(t, walk),
         c != null ? [ get_mangled(c[0]), MAP(c[1], walk) ] : null,
         f != null ? MAP(f, walk) : null ];
    },
    "toplevel": function(body) {
      var self = this;
      return with_scope(self.scope, function(){
        return [ self[0], MAP(body, walk) ];
      });
    },
    "for-in": function(has_var, name, obj, stat) {
      return [ this[0], has_var, get_mangled(name), walk(obj), walk(stat) ];
    }
  }, function() {
    return walk(ast_add_scope(ast));
  });
};

/* -----[
   - compress foo["bar"] into foo.bar,
   - remove block brackets {} where possible
   - join consecutive var declarations
   - various optimizations for IFs:
     - if (cond) foo(); else bar();  ==>  cond?foo():bar();
     - if (cond) foo();  ==>  cond&&foo();
     - if (foo) return bar(); else return baz();  ==> return foo?bar():baz(); // also for throw
     - if (foo) return bar(); else something();  ==> {if(foo)return bar();something()}
   ]----- */

var warn = function(){};

function best_of(ast1, ast2) {
  return gen_code(ast1).length > gen_code(ast2[0] === "stat" ? ast2[1] : ast2).length ? ast2 : ast1;
};

function last_stat(b) {
  if (b[0] === "block" && b[1] && b[1].length > 0)
    return b[1][b[1].length - 1];
  return b;
}

function aborts(t) {
  if (t) {
    t = last_stat(t);
    if (t[0] === "return" || t[0] === "break" || t[0] === "continue" || t[0] === "throw")
      return true;
  }
};

function boolean_expr(expr) {
  return ( (expr[0] === "unary-prefix"
      && member(expr[1], [ "!", "delete" ])) ||

     (expr[0] === "binary"
      && member(expr[1], [ "in", "instanceof", "==", "!=", "===", "!==", "<", "<=", ">=", ">" ])) ||

     (expr[0] === "binary"
      && member(expr[1], [ "&&", "||" ])
      && boolean_expr(expr[2])
      && boolean_expr(expr[3])) ||

     (expr[0] === "conditional"
      && boolean_expr(expr[2])
      && boolean_expr(expr[3])) ||

     (expr[0] === "assign"
      && expr[1] === true
      && boolean_expr(expr[3])) ||

     (expr[0] === "seq"
      && boolean_expr(expr[expr.length - 1]))
         );
};

function make_conditional(c, t, e) {
  if (c[0] === "unary-prefix" && c[1] === "!") {
    return e ? [ "conditional", c[2], e, t ] : [ "binary", "||", c[2], t ];
  } else {
    return e ? [ "conditional", c, t, e ] : [ "binary", "&&", c, t ];
  }
};

function empty(b) {
  return !b || (b[0] === "block" && (!b[1] || b[1].length === 0));
};

function is_string(node) {
  return (node[0] === "string" ||
    node[0] === "unary-prefix" && node[1] === "typeof" ||
    node[0] === "binary" && node[1] === "+" &&
    (is_string(node[2]) || is_string(node[3])));
};

var when_constant = (function(){

  var $NOT_CONSTANT = {};

  // this can only evaluate constant expressions.  If it finds anything
  // not constant, it throws $NOT_CONSTANT.
  function evaluate(expr) {
    switch (expr[0]) {
        case "string":
        case "num":
      return expr[1];
        case "name":
        case "atom":
      switch (expr[1]) {
          case "true": return true;
          case "false": return false;
      }
      break;
        case "unary-prefix":
      switch (expr[1]) {
          case "!": return !evaluate(expr[2]);
          case "typeof": return typeof evaluate(expr[2]);
          case "~": return ~evaluate(expr[2]);
          case "-": return -evaluate(expr[2]);
          case "+": return +evaluate(expr[2]);
      }
      break;
        case "binary":
      var left = expr[2], right = expr[3];
      switch (expr[1]) {
          case "&&"   : return evaluate(left) &&   evaluate(right);
          case "||"   : return evaluate(left) ||   evaluate(right);
          case "|"    : return evaluate(left) |    evaluate(right);
          case "&"    : return evaluate(left) &    evaluate(right);
          case "^"    : return evaluate(left) ^    evaluate(right);
          case "+"    : return evaluate(left) +    evaluate(right);
          case "*"    : return evaluate(left) *    evaluate(right);
          case "/"    : return evaluate(left) /    evaluate(right);
          case "-"    : return evaluate(left) -    evaluate(right);
          case "<<"   : return evaluate(left) <<   evaluate(right);
          case ">>"   : return evaluate(left) >>   evaluate(right);
          case ">>>"  : return evaluate(left) >>>  evaluate(right);
          case "=="   : return evaluate(left) ==   evaluate(right);
          case "==="  : return evaluate(left) ===  evaluate(right);
          case "!="   : return evaluate(left) !=   evaluate(right);
          case "!=="  : return evaluate(left) !==  evaluate(right);
          case "<"    : return evaluate(left) <    evaluate(right);
          case "<="   : return evaluate(left) <=   evaluate(right);
          case ">"    : return evaluate(left) >    evaluate(right);
          case ">="   : return evaluate(left) >=   evaluate(right);
          case "in"   : return evaluate(left) in   evaluate(right);
          case "instanceof" : return evaluate(left) instanceof evaluate(right);
      }
    }
    throw $NOT_CONSTANT;
  };

  return function(expr, yes, no) {
    try {
      var val = evaluate(expr), ast;
      switch (typeof val) {
          case "string": ast =  [ "string", val ]; break;
          case "number": ast =  [ "num", val ]; break;
          case "boolean": ast =  [ "name", String(val) ]; break;
          default: throw new Error("Can't handle constant of type: " + (typeof val));
      }
      return yes.call(expr, ast, val);
    } catch(ex) {
      if (ex === $NOT_CONSTANT) {
        if (expr[0] === "binary"
            && (expr[1] === "===" || expr[1] === "!==")
            && ((is_string(expr[2]) && is_string(expr[3]))
          || (boolean_expr(expr[2]) && boolean_expr(expr[3])))) {
          expr[1] = expr[1].substr(0, 2);
        }
        return no ? no.call(expr, expr) : null;
      }
      else throw ex;
    }
  };

})();

function warn_unreachable(ast) {
  if (!empty(ast))
    warn("Dropping unreachable code: " + gen_code(ast, true));
};

function ast_squeeze(ast, options) {
  options = defaults(options, {
    make_seqs   : true,
    dead_code   : true,
    keep_comps  : true,
    no_warnings : false
  });

  var w = ast_walker(), walk = w.walk, scope;

  function negate(c) {
    var not_c = [ "unary-prefix", "!", c ];
    switch (c[0]) {
        case "unary-prefix":
      return c[1] === "!" && boolean_expr(c[2]) ? c[2] : not_c;
        case "seq":
      c = slice(c);
      c[c.length - 1] = negate(c[c.length - 1]);
      return c;
        case "conditional":
      return best_of(not_c, [ "conditional", c[1], negate(c[2]), negate(c[3]) ]);
        case "binary":
      var op = c[1], left = c[2], right = c[3];
      if (!options.keep_comps) switch (op) {
          case "<="  : return [ "binary", ">", left, right ];
          case "<"   : return [ "binary", ">=", left, right ];
          case ">="  : return [ "binary", "<", left, right ];
          case ">"   : return [ "binary", "<=", left, right ];
      }
      switch (op) {
          case "=="  : return [ "binary", "!=", left, right ];
          case "!="  : return [ "binary", "==", left, right ];
          case "===" : return [ "binary", "!==", left, right ];
          case "!==" : return [ "binary", "===", left, right ];
          case "&&"  : return best_of(not_c, [ "binary", "||", negate(left), negate(right) ]);
          case "||"  : return best_of(not_c, [ "binary", "&&", negate(left), negate(right) ]);
      }
      break;
    }
    return not_c;
  };

  function with_scope(s, cont) {
    var _scope = scope;
    scope = s;
    var ret = cont();
    ret.scope = s;
    scope = _scope;
    return ret;
  };

  function rmblock(block) {
    if (block != null && block[0] === "block" && block[1]) {
      if (block[1].length === 1)
        block = block[1][0];
      else if (block[1].length === 0)
        block = [ "block" ];
    }
    return block;
  };

  function _lambda(name, args, body, kwargs) {
    return [ this[0], name, args, with_scope(body.scope, function(){
      return tighten(MAP(body, walk), "lambda");
    }), kwargs ];
  };

  // we get here for blocks that have been already transformed.
  // this function does a few things:
  // 1. discard useless blocks
  // 2. join consecutive var declarations
  // 3. remove obviously dead code
  // 4. transform consecutive statements using the comma operator
  // 5. if block_type === "lambda" and it detects constructs like if(foo) return ... - rewrite like if (!foo) { ... }
  function tighten(statements, block_type) {
    statements = statements.reduce(function(a, stat){
      if (stat) {
        if (stat[0] === "block") {
          if (stat[1]) {
            a.push.apply(a, stat[1]);
          }
        } else {
          a.push(stat);
        }
      }
      return a;
    }, []);

    statements = (function(a, prev){
      statements.forEach(function(cur){
        if (prev && ((cur[0] === "var" && prev[0] === "var") ||
               (cur[0] === "const" && prev[0] === "const"))) {
          prev[1] = prev[1].concat(cur[1]);
        } else {
          a.push(cur);
          prev = cur;
        }
      });
      return a;
    })([]);


    if (options.dead_code) statements = (function(a, has_quit){
      statements.forEach(function(st){
        if (has_quit) {
          if (st[0] === "function" || st[0] === "defun") {
            a.push(st);
          } else if (st[0] === "var" || st[0] === "const") {
            if (!options.no_warnings)
              warn("Variables declared in unreachable code");
            st[1] = MAP(st[1], function(def){
              if (def[1] && !options.no_warnings)
                warn_unreachable([ "assign", true, [ "name", def[0] ], def[1] ]);
              return [ def[0] ];
            });
            a.push(st);
          }
          else if (!options.no_warnings)
            warn_unreachable(st);
        }
        else {
          a.push(st);
          if (member(st[0], [ "return", "throw", "break", "continue" ]))
            has_quit = true;
        }
      });
      return a;
    })([]);


    if (options.make_seqs) statements = (function(a, prev) {
      statements.forEach(function(cur){
        if (prev && prev[0] === "stat" && cur[0] === "stat") {
          prev[1] = [ "seq", prev[1], cur[1] ];
        } else {
          a.push(cur);
          prev = cur;
        }
      });
      return a;
    })([]);

    if (block_type === "lambda") statements = (function(i, a, stat){
      while (i < statements.length) {
        stat = statements[i++];
        if (stat[0] === "if" && !stat[3]) {
          if (stat[2][0] === "return" && stat[2][1] == null) {
            a.push(make_if(negate(stat[1]), [ "block", statements.slice(i) ]));
            break;
          }
          var last = last_stat(stat[2]);
          if (last[0] === "return" && last[1] == null) {
            a.push(make_if(stat[1], [ "block", stat[2][1].slice(0, -1) ], [ "block", statements.slice(i) ]));
            break;
          }
        }
        a.push(stat);
      }
      return a;
    })(0, []);

    return statements;
  };

  function make_if(c, t, e) {
    return when_constant(c, function(ast, val){
      if (val) {
        warn_unreachable(e);
        return t;
      } else {
        warn_unreachable(t);
        return e;
      }
    }, function() {
      return make_real_if(c, t, e);
    });
  };

  function make_real_if(c, t, e) {
    c = walk(c);
    t = walk(t);
    e = walk(e);

    if (empty(t)) {
      c = negate(c);
      t = e;
      e = null;
    } else if (empty(e)) {
      e = null;
    } else {
      // if we have both else and then, maybe it makes sense to switch them?
      (function(){
        var a = gen_code(c);
        var n = negate(c);
        var b = gen_code(n);
        if (b.length < a.length) {
          var tmp = t;
          t = e;
          e = tmp;
          c = n;
        }
      })();
    }
    if (empty(e) && empty(t))
      return [ "stat", c ];
    var ret = [ "if", c, t, e ];
    if (t[0] === "if" && empty(t[3]) && empty(e)) {
      ret = best_of(ret, walk([ "if", [ "binary", "&&", c, t[1] ], t[2] ]));
    }
    else if (t[0] === "stat") {
      if (e) {
        if (e[0] === "stat") {
          ret = best_of(ret, [ "stat", make_conditional(c, t[1], e[1]) ]);
        }
      }
      else {
        ret = best_of(ret, [ "stat", make_conditional(c, t[1]) ]);
      }
    }
    else if (e && t[0] === e[0] && (t[0] === "return" || t[0] === "throw") && t[1] && e[1]) {
      ret = best_of(ret, [ t[0], make_conditional(c, t[1], e[1] ) ]);
    }
    else if (e && aborts(t)) {
      ret = [ [ "if", c, t ] ];
      if (e[0] === "block") {
        if (e[1]) ret = ret.concat(e[1]);
      }
      else {
        ret.push(e);
      }
      ret = walk([ "block", ret ]);
    }
    else if (t && aborts(e)) {
      ret = [ [ "if", negate(c), e ] ];
      if (t[0] === "block") {
        if (t[1]) ret = ret.concat(t[1]);
      } else {
        ret.push(t);
      }
      ret = walk([ "block", ret ]);
    }
    return ret;
  };

  function _do_while(cond, body) {
    return when_constant(cond, function(cond, val){
      if (!val) {
        warn_unreachable(body);
        return [ "block" ];
      } else {
        return [ "for", null, null, null, walk(body) ];
      }
    });
  };

  return w.with_walkers({
    "sub": function(expr, subscript) {
      if (subscript[0] === "string") {
        var name = subscript[1];
        if (is_identifier(name)) {
          return [ "dot", walk(expr), name ];
        }
      }
    },
    "if": make_if,
    "toplevel": function(body) {
      return [ "toplevel", with_scope(this.scope, function(){
        return tighten(MAP(body, walk));
      }) ];
    },
    "switch": function(expr, body) {
      var last = body.length - 1;
      return [ "switch", walk(expr), MAP(body, function(branch, i){
        var block = tighten(MAP(branch[1], walk));
        if (i === last && block.length > 0) {
          var node = block[block.length - 1];
          if (node[0] === "break" && !node[1])
            block.pop();
        }
        return [ branch[0] ? walk(branch[0]) : null, block ];
      }) ];
    },
    "function": function() {
      var ret = _lambda.apply(this, arguments);
      if (ret[1] && !HOP(scope.refs, ret[1])) {
        ret[1] = null;
      }
      return ret;
    },
    "defun": _lambda,
    "block": function(body) {
      if (body) return rmblock([ "block", tighten(MAP(body, walk)) ]);
    },
    "binary": function(op, left, right) {
      return when_constant([ "binary", op, walk(left), walk(right) ], function yes(c){
        return best_of(walk(c), this);
      }, function no() {
        return this;
      });
    },
    "conditional": function(c, t, e) {
      return make_conditional(walk(c), walk(t), walk(e));
    },
    "try": function(t, c, f) {
      return [
        "try",
        tighten(MAP(t, walk)),
        c != null ? [ c[0], tighten(MAP(c[1], walk)) ] : null,
        f != null ? tighten(MAP(f, walk)) : null
      ];
    },
    "unary-prefix": function(op, expr) {
      expr = walk(expr);
      var ret = [ "unary-prefix", op, expr ];
      if (op === "!")
        ret = best_of(ret, negate(expr));
      return when_constant(ret, function(ast, val){
        return walk(ast); // it's either true or false, so minifies to !0 or !1
      }, function() { return ret });
    },
    "name": function(name) {
      switch (name) {
          case "true": return [ "unary-prefix", "!", [ "num", 0 ]];
          case "false": return [ "unary-prefix", "!", [ "num", 1 ]];
      }
    },
    "new": function(ctor, args) {
      if (ctor[0] === "name" && ctor[1] === "Array" && !scope.has("Array")) {
        if (args.length != 1) {
          return [ "array", args ];
        } else {
          return [ "call", [ "name", "Array" ], args ];
        }
      }
    },
    "call": function(expr, args) {
      if (expr[0] === "name" && expr[1] === "Array" && args.length != 1 && !scope.has("Array")) {
        return [ "array", args ];
      }
    },
    "while": _do_while,
    "do": _do_while
  }, function() {
    return walk(ast_add_scope(ast));
  });
};

/* -----[ re-generate code from the AST ]----- */

var DOT_CALL_NO_PARENS = jsp.array_to_hash([
  "name",
  "array",
  "string",
  "dot",
  "sub",
  "call",
  "regexp"
]);

function make_string(str) {
  var dq = 0, sq = 0;
  str = str.replace(/[\\\b\f\n\r\t\x22\x27]/g, function(s){
    switch (s) {
        case "\\": return "\\\\";
        case "\b": return "\\b";
        case "\f": return "\\f";
        case "\n": return "\\n";
        case "\r": return "\\r";
        case "\t": return "\\t";
        case '"': ++dq; return '"';
        case "'": ++sq; return "'";
    }
    return s;
  });
  if (dq > sq) {
    return "'" + str.replace(/\x27/g, "\\'") + "'";
  } else {
    return '"' + str.replace(/\x22/g, '\\"') + '"';
  }
};

function gen_code(ast, beautify) {
  if (beautify) beautify = defaults(beautify, {
    indent_start : 0,
    indent_level : 4,
    quote_keys   : false,
    space_colon  : false
  });
  var indentation = 0,
      newline = beautify ? "\n" : "",
      space = beautify ? " " : "";

  function indent(line) {
    if (line == null)
      line = "";
    if (beautify)
      line = repeat_string(" ", beautify.indent_start + indentation * beautify.indent_level) + line;
    return line;
  };

  function with_indent(cont, incr) {
    if (incr == null) incr = 1;
    indentation += incr;
    try { return cont.apply(null, slice(arguments, 1)); }
    finally { indentation -= incr; }
  };

  function add_spaces(a) {
    if (beautify)
      return a.join(" ");
    var b = [];
    for (var i = 0; i < a.length; ++i) {
      var next = a[i + 1];
      b.push(a[i]);
      if (next &&
          ((/[a-z0-9_\x24]$/i.test(a[i].toString()) && /^[a-z0-9_\x24]/i.test(next.toString())) ||
           (/[\+\-]$/.test(a[i].toString()) && /^[\+\-]/.test(next.toString())))) {
        b.push(" ");
      }
    }
    return b.join("");
  };

  function add_commas(a) {
    return a.join("," + space);
  };

  function parenthesize(expr) {
    var gen = make(expr);
    for (var i = 1; i < arguments.length; ++i) {
      var el = arguments[i];
      if ((el instanceof Function && el(expr)) || expr[0] == el)
        return "(" + gen + ")";
    }
    return gen;
  };

  function best_of(a) {
    if (a.length === 1) {
      return a[0];
    }
    if (a.length === 2) {
      var b = a[1];
      a = a[0];
      return a.length <= b.length ? a : b;
    }
    return best_of([ a[0], best_of(a.slice(1)) ]);
  };

  function needs_parens(expr) {
    if (expr[0] === "function") {
      // dot/call on a literal function requires the
      // function literal itself to be parenthesized
      // only if it's the first "thing" in a
      // statement.  This means that the parent is
      // "stat", but it could also be a "seq" and
      // we're the first in this "seq" and the
      // parent is "stat", and so on.  Messy stuff,
      // but it worths the trouble.
      var a = slice($stack), self = a.pop(), p = a.pop();
      while (p) {
        if (p[0] === "stat") return true;
        if ((p[0] === "seq" && p[1] === self) ||
            (p[0] === "call" && p[1] === self) ||
            (p[0] === "binary" && p[2] === self)) {
          self = p;
          p = a.pop();
        } else {
          return false;
        }
      }
    }
    return !HOP(DOT_CALL_NO_PARENS, expr[0]);
  };

  function make_num(num) {
    var str = num.toString(10), a = [ str.replace(/^0\./, ".") ], m;
    if (Math.floor(num) === num) {
      a.push("0x" + num.toString(16).toLowerCase(), // probably pointless
             "0" + num.toString(8)); // same.
      if ((m = /^(.*?)(0+)$/.exec(num))) {
        a.push(m[1] + "e" + m[2].length);
      }
    } else if ((m = /^0?\.(0+)(.*)$/.exec(num))) {
      a.push(m[2] + "e-" + (m[1].length + m[2].length),
             str.substr(str.indexOf(".")));
    }
    return best_of(a);
  };

  var generators = {
    "string": make_string,
    "num": make_num,
    "name": make_name,
    "toplevel": function(statements) {
      return make_block_statements(statements)
        .join(newline + newline);
    },
    "block": make_block,
    "var": function(defs) {
      return "var " + add_commas(MAP(defs, make_1vardef)) + ";";
    },
    "const": function(defs) {
      return "const " + add_commas(MAP(defs, make_1vardef)) + ";";
    },
    "import": function (defs) {
      // Note: the out-commented "var" depends on AST pre-processing from
      // ast_first_time_var_delc -- if ast_first_time_var_delc is not applied
      // prior to calling gen_code, the "var" need to be activated and used.
      return /*"var "+*/add_commas(MAP(defs, function(def) {
        var varname = def[0];
        var modid = varname;
        if (def.length > 1) {
          modid = def[1][1];
        }
        return varname + ' = require('+make(['string', modid])+')'
      })) + ';';
    },
    "export": function (defs) {
      // Note: the out-commented "var" depends on AST pre-processing from
      // ast_first_time_var_delc -- if ast_first_time_var_delc is not applied
      // prior to calling gen_code, the "var" need to be activated and used.
      return /*"var "+*/add_commas(MAP(defs, function(def) {
        var varname = def[0];
        var modid = varname;
        if (def.length > 1) {
          modid = def[1][1];
        }
        return 'exports.'+varname+' = '+add_commas(MAP(defs, make_1vardef));
      })) + ';';
    },
    "try": function(tr, ca, fi) {
      var out = [ "try", make_block(tr) ];
      if (ca) out.push("catch", "(" + ca[0] + ")", make_block(ca[1]));
      if (fi) out.push("finally", make_block(fi));
      return add_spaces(out);
    },
    "throw": function(expr) {
      return add_spaces([ "throw", make(expr) ]) + ";";
    },
    "new": function(ctor, args) {
      args = args.length > 0 ? "(" + add_commas(MAP(args, make)) + ")" : "";
      return add_spaces([ "new", parenthesize(ctor, "seq", "binary", "conditional", "assign", function(expr){
        var w = ast_walker(), has_call = {};
        try {
          w.with_walkers({
            "call": function() { throw has_call },
            "function": function() { return this }
          }, function(){
            w.walk(expr);
          });
        } catch(ex) {
          if (ex === has_call)
            return true;
          throw ex;
        }
      }) + args ]);
    },
    "switch": function(expr, body) {
      return add_spaces([ "switch", "(" + make(expr) + ")", make_switch_block(body) ]);
    },
    "break": function(label) {
      var out = "break";
      if (label != null)
        out += " " + make_name(label);
      return out + ";";
    },
    "continue": function(label) {
      var out = "continue";
      if (label != null)
        out += " " + make_name(label);
      return out + ";";
    },
    "conditional": function(co, th, el) {
      return add_spaces([ parenthesize(co, "assign", "seq", "conditional"), "?",
              parenthesize(th, "seq"), ":",
              parenthesize(el, "seq") ]);
    },
    "assign": function(op, lvalue, rvalue) {
      if (op && op !== true) op += "=";
      else op = "=";
      if (!rvalue) console.log('assign:', op, lvalue, rvalue)
      return add_spaces([ make(lvalue), op, parenthesize(rvalue, "seq") ]);
    },
    "dot": function(expr) {
      var out = make(expr), i = 1;
      if (expr[0] === "num")
        out += ".";
      else if (needs_parens(expr))
        out = "(" + out + ")";
      while (i < arguments.length)
        out += "." + make_name(arguments[i++]);
      return out;
    },
    "call": function(func, args) {
      var f = make(func);
      if (needs_parens(func))
        f = "(" + f + ")";
      return f + "(" + add_commas(MAP(args, function(expr){
        return parenthesize(expr, "seq");
      })) + ")";
    },
    "function": make_function,
    "defun": make_function,
    "if": function(co, th, el) {
      var out = [ "if", "(" + make(co) + ")", el ? make_then(th) : make(th) ];
      if (el) {
        out.push("else", make(el));
      }
      return add_spaces(out);
    },
    "for": function(init, cond, step, block) {
      var out = [ "for" ];
      init = (init != null ? make(init) : "").replace(/;*\s*$/, ";" + space);
      cond = (cond != null ? make(cond) : "").replace(/;*\s*$/, ";" + space);
      step = (step != null ? make(step) : "").replace(/;*\s*$/, "");
      var args = init + cond + step;
      if (args === "; ; ") args = ";;";
      out.push("(" + args + ")", make(block));
      return add_spaces(out);
    },
    "for-in": function(has_var, key, hash, block) {
      var out = add_spaces([ "for", "(" ]);
      if (has_var)
        out += "var ";
      out += add_spaces([ make_name(key) + " in " + make(hash) + ")", make(block) ]);
      return out;
    },
    "while": function(condition, block) {
      return add_spaces([ "while", "(" + make(condition) + ")", make(block) ]);
    },
    "do": function(condition, block) {
      return add_spaces([ "do", make(block), "while", "(" + make(condition) + ")" ]) + ";";
    },
    "return": function(expr) {
      var out = [ "return" ];
      if (expr != null) out.push(make(expr));
      return add_spaces(out) + ";";
    },
    "binary": function(operator, lvalue, rvalue) {
      var left = make(lvalue), right = make(rvalue);
      // XXX: I'm pretty sure other cases will bite here.
      //      we need to be smarter.
      //      adding parens all the time is the safest bet.
      if (member(lvalue[0], [ "assign", "conditional", "seq" ]) ||
          lvalue[0] === "binary" && PRECEDENCE[operator] > PRECEDENCE[lvalue[1]]) {
        left = "(" + left + ")";
      }
      if (member(rvalue[0], [ "assign", "conditional", "seq" ]) ||
          rvalue[0] === "binary" && PRECEDENCE[operator] >= PRECEDENCE[rvalue[1]] &&
          !(rvalue[1] === operator && member(operator, [ "&&", "||", "*" ]))) {
        right = "(" + right + ")";
      }
      if (operator === 'xor') {
        operator = '^';
      }
      return add_spaces([ left, operator, right ]);
    },
    "unary-prefix": function(operator, expr) {
      var val = make(expr);
      if (!(expr[0] === "num" || (expr[0] === "unary-prefix" && !HOP(OPERATORS, operator + expr[1])) || !needs_parens(expr)))
        val = "(" + val + ")";
      return operator + (jsp.is_alphanumeric_char(operator.charAt(0)) ? " " : "") + val;
    },
    "unary-postfix": function(operator, expr) {
      var val = make(expr);
      if (!(expr[0] === "num" || (expr[0] === "unary-postfix" && !HOP(OPERATORS, operator + expr[1])) || !needs_parens(expr)))
        val = "(" + val + ")";
      return val + operator;
    },
    "sub": function(expr, subscript) {
      var hash = make(expr);
      if (needs_parens(expr))
        hash = "(" + hash + ")";
      return hash + "[" + make(subscript) + "]";
    },
    "object": function(props) {
      if (props.length === 0)
        return "{}";
      return "{" + newline + with_indent(function(){
        return MAP(props, function(p){
          if (p.length === 3) {
            // getter/setter.  The name is in p[0], the arg.list in p[1][2], the
            // body in p[1][3] and type ("get" / "set") in p[2].
            return indent(make_function(p[0], p[1][2], p[1][3], p[1][4], p[2]));
          }
          var key = p[0], val = make(p[1]);
          if (beautify && beautify.quote_keys) {
            key = make_string(key);
          } else if ((typeof key === "number" || !beautify && +key + "" === key)
               && parseFloat(key) >= 0) {
            key = make_num(+key);
          } else if (!is_identifier(key)) {
            key = make_string(key);
          }
          return indent(add_spaces(beautify && beautify.space_colon
                 ? [ key, ":", val ]
                 : [ key + ":", val ]));
        }).join("," + newline);
      }) + newline + indent("}");
    },
    "regexp": function(rx, mods) {
      return "/" + rx + "/" + mods;
    },
    "array": function(elements) {
      if (elements.length === 0) return "[]";
      return add_spaces([ "[", add_commas(MAP(elements, function(el){
        if (!beautify && el[0] === "atom" && el[1] === "undefined") return "";
        return parenthesize(el, "seq");
      })), "]" ]);
    },
    "stat": function(stmt) {
      return make(stmt).replace(/;*\s*$/, ";");
    },
    "seq": function() {
      return add_commas(MAP(slice(arguments), make));
    },
    "label": function(name, block) {
      return add_spaces([ make_name(name), ":", make(block) ]);
    },
    "with": function(expr, block) {
      return add_spaces([ "with", "(" + make(expr) + ")", make(block) ]);
    },
    "atom": function(name) {
      return make_name(name);
    }
  };

  // The squeezer replaces "block"-s that contain only a single
  // statement with the statement itself; technically, the AST
  // is correct, but this can create problems when we output an
  // IF having an ELSE clause where the THEN clause ends in an
  // IF *without* an ELSE block (then the outer ELSE would refer
  // to the inner IF).  This function checks for this case and
  // adds the block brackets if needed.
  function make_then(th) {
    if (th[0] === "do") {
      // https://github.com/mishoo/UglifyJS/issues/#issue/57
      // IE croaks with "syntax error" on code like this:
      //     if (foo) do ... while(cond); else ...
      // we need block brackets around do/while
      return make([ "block", [ th ]]);
    }
    var b = th;
    while (true) {
      var type = b[0];
      if (type === "if") {
        if (!b[3])
          // no else, we must add the block
          return make([ "block", [ th ]]);
        b = b[3];
      }
      else if (type === "while" || type === "do") b = b[2];
      else if (type === "for" || type === "for-in") b = b[4];
      else break;
    }
    return make(th);
  };

  function make_function(name, args, body, kwargs, keyword) {
    var out = keyword || "function";
    if (name) {
      out += " " + make_name(name);
    } else if (beautify) {
      out += " ";
    }
    out += "(" + add_commas(MAP(args, make_name)) + ")";
    return add_spaces([ out, make_block(body) ]);
  };

  function make_name(name) {
    return name.toString();
  };

  function make_block_statements(statements) {
    for (var a = [], last = statements.length - 1, i = 0; i <= last; ++i) {
      var stat = statements[i];
      var code = make(stat);
      if (code != ";") {
        if (!beautify && i === last) {
          if ((stat[0] === "while" && empty(stat[2])) ||
              (member(stat[0], [ "for", "for-in"] ) && empty(stat[4])) ||
              (stat[0] === "if" && empty(stat[2]) && !stat[3]) ||
              (stat[0] === "if" && stat[3] && empty(stat[3]))) {
            code = code.replace(/;*\s*$/, ";");
          } else {
            code = code.replace(/;+\s*$/, "");
          }
        }
        a.push(code);
      }
    }
    return MAP(a, indent);
  };

  function make_switch_block(body) {
    var n = body.length;
    if (n === 0) return "{}";
    return "{" + newline + MAP(body, function(branch, i){
      var has_body = branch[1].length > 0, code = with_indent(function(){
        return indent(branch[0]
                ? add_spaces([ "case", make(branch[0]) + ":" ])
                : "default:");
      }, 0.5) + (has_body ? newline + with_indent(function(){
        return make_block_statements(branch[1]).join(newline);
      }) : "");
      if (!beautify && has_body && i < n - 1)
        code += ";";
      return code;
    }).join(newline) + newline + indent("}");
  };

  function make_block(statements) {
    if (!statements) return ";";
    if (statements.length === 0) return "{}";
    return "{" + newline + with_indent(function(){
      return make_block_statements(statements).join(newline);
    }) + newline + indent("}");
  };

  function make_1vardef(def) {
    var name = def[0], val = def[1];
    if (val != null)
      name = add_spaces([ name, "=", make(val) ]);
    return name;
  };

  var $stack = [];

  function make(node) {
    if (!node) return;
    var type = node[0];
    var gen = generators[type];
    if (!gen)
      throw new Error("Can't find generator for \"" + type + "\"");
    $stack.push(node);
    var ret = gen.apply(type, node.slice(1));
    $stack.pop();
    return ret;
  };

  return make(ast);
};

function split_lines(code, max_line_length) {
  var splits = [ 0 ];
  jsp.parse(function(){
    var next_token = jsp.tokenizer(code);
    var last_split = 0;
    var prev_token;
    function current_length(tok) {
      return tok.pos - last_split;
    };
    function split_here(tok) {
      last_split = tok.pos;
      splits.push(last_split);
    };
    function custom(){
      var tok = next_token.apply(this, arguments);
      out: {
        if (prev_token) {
          if (prev_token.type === "keyword") break out;
        }
        if (current_length(tok) > max_line_length) {
          switch (tok.type) {
              case "keyword":
              case "atom":
              case "name":
              case "punc":
            split_here(tok);
            break out;
          }
        }
      }
      prev_token = tok;
      return tok;
    };
    custom.context = function() {
      return next_token.context.apply(this, arguments);
    };
    return custom;
  }());
  return splits.map(function(pos, i){
    return code.substring(pos, splits[i + 1] || code.length);
  }).join("\n");
};

/* -----[ Utilities ]----- */

function repeat_string(str, i) {
  if (i <= 0) return "";
  if (i === 1) return str;
  var d = repeat_string(str, i >> 1);
  d += d;
  if (i & 1) d += str;
  return d;
};

function defaults(args, defs) {
  var ret = {};
  if (args === true)
    args = {};
  for (var i in defs) if (HOP(defs, i)) {
    ret[i] = (args && HOP(args, i)) ? args[i] : defs[i];
  }
  return ret;
};

function is_identifier(name) {
  return /^[a-z_$][a-z0-9_$]*$/i.test(name)
    && name != "this"
    && !HOP(jsp.KEYWORDS_ATOM, name)
    && !HOP(jsp.RESERVED_WORDS, name)
    && !HOP(jsp.KEYWORDS, name);
};

function HOP(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
};

// some utilities

var MAP;

(function(){
  MAP = function(a, f, o) {
    var ret = [];
    for (var i = 0; i < a.length; ++i) {
      var val = f.call(o, a[i], i);
      if (val instanceof AtTop) ret.unshift(val.v);
      else ret.push(val);
    }
    return ret;
  };
  MAP.at_top = function(val) { return new AtTop(val) };
  function AtTop(val) { this.v = val };
})();

/* -----[ Exports ]----- */

exports.ast_walker = ast_walker;
exports.ast_mangle = ast_mangle;
exports.ast_squeeze = ast_squeeze;
exports.gen_code = gen_code;
exports.ast_add_scope = ast_add_scope;
exports.ast_squeeze_more = require("./squeeze-more").ast_squeeze_more;
exports.set_logger = function(logger) { warn = logger };
exports.make_string = make_string;
exports.split_lines = split_lines;
exports.MAP = MAP;
exports.Scope = Scope;
});
_require.define("compiler/squeeze-more","compiler/squeeze-more.js",function(require, module, exports, __filename, __dirname){/*
Copyright 2010 (c) Mihai Bazon <mihai.bazon@gmail.com>
Based on parse-js (http://marijn.haverbeke.nl/parse-js/).

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions
are met:

    * Redistributions of source code must retain the above
      copyright notice, this list of conditions and the following
      disclaimer.

    * Redistributions in binary form must reproduce the above
      copyright notice, this list of conditions and the following
      disclaimer in the documentation and/or other materials
      provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDER “AS IS” AND ANY
EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
SUCH DAMAGE.
*/

var jsp = require("./parser"),
    pro = require("./process"),
    slice = jsp.slice,
    member = jsp.member,
    PRECEDENCE = jsp.PRECEDENCE,
    OPERATORS = jsp.OPERATORS;

function ast_squeeze_more(ast) {
        var w = pro.ast_walker(), walk = w.walk;
        return w.with_walkers({
                "call": function(expr, args) {
                        if (expr[0] == "dot" && expr[2] == "toString" && args.length == 0) {
                                // foo.toString()  ==>  foo+""
                                return [ "binary", "+", expr[1], [ "string", "" ]];
                        }
                }
        }, function() {
                return walk(ast);
        });
};

exports.ast_squeeze_more = ast_squeeze_more;
});
_require.define("","index.js",function(require, module, exports, __filename, __dirname){global.Move = exports;
global.__move = exports; // DEPRECATED since 0.4.4. Use global.Move instead.

// Version as a string e.g. "0.2.4"
exports.version = function version() {
  if (exports.version._v === undefined)
    exports.version._v = JSON.parse(require('fs').readFileSync(__dirname+'/../package.json', 'utf8')).version;
  return exports.version._v;
}

require('./compiler');  // includes the runtime library, but not the cli library
});
_require.define("runtime/es5_array","runtime/es5_array.js",function(require, module, exports, __filename, __dirname){if (!Array.isArray)
Array.isArray = function isArray(obj) {
  return (obj instanceof Array) ||
         Object.prototype.toString.call(obj) === "[object Array]";
};


if (!Array.prototype.indexOf)
Array.prototype.indexOf = function indexOf(value, begin) {
  var i, L = this.length;
  for (i = +begin || 0; i < L; ++i) {
    if (this[i] === value) return i;
  }
  return -1;
};

if (!Array.prototype.lastIndexOf)
Array.prototype.lastIndexOf = function lastIndexOf(value, begin) {
  var i = Math.min(this.length, +begin || 0);
  for (; i !== -1; --i) {
    if (this[i] === value) return i;
  }
  return -1;
};

if (!Array.prototype.filter)
Array.prototype.filter = function filter(block, ctx) {
  var values = [];
  for (var i = 0; i < this.length; i++) {
    if (block.call(ctx, this[i])) {
      values.push(this[i]);
    }
  }
  return values;
};

if (!Array.prototype.forEach)
Array.prototype.forEach = function forEach(block, ctx) {
  var len = this.length >>> 0;
  for (var i = 0; i < len; ++i) {
    if (i in this) {
      block.call(ctx, this[i], i, this);
    }
  }
};

if (!Array.prototype.every)
Array.prototype.every = function every(block, ctx) {
  var len = this.length >>> 0;
  for (var i = 0; i < len; ++i) {
    if (i in this && !block.call(ctx, this[i], i, this))
      return false;
  }
  return true;
};

if (!Array.prototype.some)
Array.prototype.some = function some(block, ctx) {
  var len = this.length >>> 0;
  for (var i = 0; i < len; ++i) {
    if (i in this && block.call(ctx, this[i], i, this))
      return true;
  }
  return false;
};

if (!Array.prototype.map)
Array.prototype.map = function map(fun, ctx) {
  var len = this.length >>> 0, res = new Array(len);
  for (var i = 0; i < len; ++i) {
    res[i] = fun.call(ctx, this[i], i, this);
  }
  return res;
};

if (!Array.prototype.reduce)
Array.prototype.reduce = function reduce(fun /*, initial*/) {
  var len = this.length >>> 0, i = 0, rv;
  // no value to return if no initial value and an empty array
  if (len === 0 && arguments.length === 1) throw new TypeError();
  if (arguments.length >= 2) {
    rv = arguments[1];
  } else {
    do {
      if (i in this) {
        rv = this[i++];
        break;
      }
      // if array contains no values, no initial value to return
      if (++i >= len) throw new TypeError();
    } while (true);
  }
  for (; i < len; i++) {
    if (i in this) {
      rv = fun.call(null, rv, this[i], i, this);
    }
  }
  return rv;
};

// TODO: reduceRight

if (!Array.prototype.unshift)
Array.prototype.unshift = function() {
  this.reverse();
  var i = arguments.length;
  while (i--)
    this.push(arguments[i]);
  this.reverse();
  return this.length;
};
});
_require.define("runtime/es5_date","runtime/es5_date.js",function(require, module, exports, __filename, __dirname){if (!Date.now)
Date.now = function now() { return (new Date).getTime(); };

if (!Date.prototype.getTimezoneOffset)
Date.prototype.getTimezoneOffset = function getTimezoneOffset() {
  if (this._timezoneOffsetStd === undefined) {
    var date1 = new Date(this.getFullYear(), this.getMonth(), this.getDate(),
                         0,0,0,0),
        temp = date1.toGMTString(),
        date2 = new Date(temp.substring(0, temp.lastIndexOf(" ")-1));
    this._timezoneOffsetStd = (date2 - date1) / 60000;
  }
  return this._timezoneOffsetStd;
};
});
_require.define("runtime/es5_json","runtime/es5_json.js",function(require, module, exports, __filename, __dirname){/*
    http://www.JSON.org/json2.js
    2011-01-18

    Public Domain.

    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

    See http://www.JSON.org/js.html


    This code should be minified before deployment.
    See http://javascript.crockford.com/jsmin.html

    USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
    NOT CONTROL.


    This file creates a global JSON object containing two methods: stringify
    and parse.

        JSON.stringify(value, replacer, space)
            value       any JavaScript value, usually an object or array.

            replacer    an optional parameter that determines how object
                        values are stringified for objects. It can be a
                        function or an array of strings.

            space       an optional parameter that specifies the indentation
                        of nested structures. If it is omitted, the text will
                        be packed without extra whitespace. If it is a number,
                        it will specify the number of spaces to indent at each
                        level. If it is a string (such as '\t' or '&nbsp;'),
                        it contains the characters used to indent at each level.

            This method produces a JSON text from a JavaScript value.

            When an object value is found, if the object contains a toJSON
            method, its toJSON method will be called and the result will be
            stringified. A toJSON method does not serialize: it returns the
            value represented by the name/value pair that should be serialized,
            or undefined if nothing should be serialized. The toJSON method
            will be passed the key associated with the value, and this will be
            bound to the value

            For example, this would serialize Dates as ISO strings.

                Date.prototype.toJSON = function (key) {
                    function f(n) {
                        // Format integers to have at least two digits.
                        return n < 10 ? '0' + n : n;
                    }

                    return this.getUTCFullYear()   + '-' +
                         f(this.getUTCMonth() + 1) + '-' +
                         f(this.getUTCDate())      + 'T' +
                         f(this.getUTCHours())     + ':' +
                         f(this.getUTCMinutes())   + ':' +
                         f(this.getUTCSeconds())   + 'Z';
                };

            You can provide an optional replacer method. It will be passed the
            key and value of each member, with this bound to the containing
            object. The value that is returned from your method will be
            serialized. If your method returns undefined, then the member will
            be excluded from the serialization.

            If the replacer parameter is an array of strings, then it will be
            used to select the members to be serialized. It filters the results
            such that only members with keys listed in the replacer array are
            stringified.

            Values that do not have JSON representations, such as undefined or
            functions, will not be serialized. Such values in objects will be
            dropped; in arrays they will be replaced with null. You can use
            a replacer function to replace those with JSON values.
            JSON.stringify(undefined) returns undefined.

            The optional space parameter produces a stringification of the
            value that is filled with line breaks and indentation to make it
            easier to read.

            If the space parameter is a non-empty string, then that string will
            be used for indentation. If the space parameter is a number, then
            the indentation will be that many spaces.

            Example:

            text = JSON.stringify(['e', {pluribus: 'unum'}]);
            // text is '["e",{"pluribus":"unum"}]'


            text = JSON.stringify(['e', {pluribus: 'unum'}], null, '\t');
            // text is '[\n\t"e",\n\t{\n\t\t"pluribus": "unum"\n\t}\n]'

            text = JSON.stringify([new Date()], function (key, value) {
                return this[key] instanceof Date ?
                    'Date(' + this[key] + ')' : value;
            });
            // text is '["Date(---current time---)"]'


        JSON.parse(text, reviver)
            This method parses a JSON text to produce an object or array.
            It can throw a SyntaxError exception.

            The optional reviver parameter is a function that can filter and
            transform the results. It receives each of the keys and values,
            and its return value is used instead of the original value.
            If it returns what it received, then the structure is not modified.
            If it returns undefined then the member is deleted.

            Example:

            // Parse the text. Values that look like ISO date strings will
            // be converted to Date objects.

            myData = JSON.parse(text, function (key, value) {
                var a;
                if (typeof value === 'string') {
                    a =
/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
                    if (a) {
                        return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
                            +a[5], +a[6]));
                    }
                }
                return value;
            });

            myData = JSON.parse('["Date(09/09/2001)"]', function (key, value) {
                var d;
                if (typeof value === 'string' &&
                        value.slice(0, 5) === 'Date(' &&
                        value.slice(-1) === ')') {
                    d = new Date(value.slice(5, -1));
                    if (d) {
                        return d;
                    }
                }
                return value;
            });


    This is a reference implementation. You are free to copy, modify, or
    redistribute.
*/

/*jslint evil: true, strict: false, regexp: false */

/*members "", "\b", "\t", "\n", "\f", "\r", "\"", JSON, "\\", apply,
    call, charCodeAt, getUTCDate, getUTCFullYear, getUTCHours,
    getUTCMinutes, getUTCMonth, getUTCSeconds, hasOwnProperty, join,
    lastIndex, length, parse, prototype, push, replace, slice, stringify,
    test, toJSON, toString, valueOf
*/


// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

var JSON = global.JSON;
if (typeof JSON !== 'object' ||
    typeof JSON.stringify !== 'function' ||
    typeof JSON.parse !== 'function') {
  JSON = global.JSON = {};

  (function () {
      "use strict";

      function f(n) {
          // Format integers to have at least two digits.
          return n < 10 ? '0' + n : n;
      }

      if (typeof Date.prototype.toJSON !== 'function') {

          Date.prototype.toJSON = function (key) {

              return isFinite(this.valueOf()) ?
                  this.getUTCFullYear()     + '-' +
                  f(this.getUTCMonth() + 1) + '-' +
                  f(this.getUTCDate())      + 'T' +
                  f(this.getUTCHours())     + ':' +
                  f(this.getUTCMinutes())   + ':' +
                  f(this.getUTCSeconds())   + 'Z' : null;
          };

          String.prototype.toJSON      =
              Number.prototype.toJSON  =
              Boolean.prototype.toJSON = function (key) {
                  return this.valueOf();
              };
      }

      var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
          escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
          gap,
          indent,
          meta = {    // table of character substitutions
              '\b': '\\b',
              '\t': '\\t',
              '\n': '\\n',
              '\f': '\\f',
              '\r': '\\r',
              '"' : '\\"',
              '\\': '\\\\'
          },
          rep;


      function quote(string) {

  // If the string contains no control characters, no quote characters, and no
  // backslash characters, then we can safely slap some quotes around it.
  // Otherwise we must also replace the offending characters with safe escape
  // sequences.

          escapable.lastIndex = 0;
          return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
              var c = meta[a];
              return typeof c === 'string' ? c :
                  '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
          }) + '"' : '"' + string + '"';
      }


      function str(key, holder) {

  // Produce a string from holder[key].

          var i,          // The loop counter.
              k,          // The member key.
              v,          // The member value.
              length,
              mind = gap,
              partial,
              value = holder[key];

  // If the value has a toJSON method, call it to obtain a replacement value.

          if (value && typeof value === 'object' &&
                  typeof value.toJSON === 'function') {
              value = value.toJSON(key);
          }

  // If we were called with a replacer function, then call the replacer to
  // obtain a replacement value.

          if (typeof rep === 'function') {
              value = rep.call(holder, key, value);
          }

  // What happens next depends on the value's type.

          switch (typeof value) {
          case 'string':
              return quote(value);

          case 'number':

  // JSON numbers must be finite. Encode non-finite numbers as null.

              return isFinite(value) ? String(value) : 'null';

          case 'boolean':
          case 'null':

  // If the value is a boolean or null, convert it to a string. Note:
  // typeof null does not produce 'null'. The case is included here in
  // the remote chance that this gets fixed someday.

              return String(value);

  // If the type is 'object', we might be dealing with an object or an array or
  // null.

          case 'object':

  // Due to a specification blunder in ECMAScript, typeof null is 'object',
  // so watch out for that case.

              if (!value) {
                  return 'null';
              }

  // Make an array to hold the partial results of stringifying this object value.

              gap += indent;
              partial = [];

  // Is the value an array?

              if (Object.prototype.toString.apply(value) === '[object Array]') {

  // The value is an array. Stringify every element. Use null as a placeholder
  // for non-JSON values.

                  length = value.length;
                  for (i = 0; i < length; i += 1) {
                      partial[i] = str(i, value) || 'null';
                  }

  // Join all of the elements together, separated with commas, and wrap them in
  // brackets.

                  v = partial.length === 0 ? '[]' : gap ?
                      '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                      '[' + partial.join(',') + ']';
                  gap = mind;
                  return v;
              }

  // If the replacer is an array, use it to select the members to be stringified.

              if (rep && typeof rep === 'object') {
                  length = rep.length;
                  for (i = 0; i < length; i += 1) {
                      k = rep[i];
                      if (typeof k === 'string') {
                          v = str(k, value);
                          if (v) {
                              partial.push(quote(k) + (gap ? ': ' : ':') + v);
                          }
                      }
                  }
              } else {

  // Otherwise, iterate through all of the keys in the object.

                  for (k in value) {
                      if (Object.hasOwnProperty.call(value, k)) {
                          v = str(k, value);
                          if (v) {
                              partial.push(quote(k) + (gap ? ': ' : ':') + v);
                          }
                      }
                  }
              }

  // Join all of the member texts together, separated with commas,
  // and wrap them in braces.

              v = partial.length === 0 ? '{}' : gap ?
                  '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
                  '{' + partial.join(',') + '}';
              gap = mind;
              return v;
          }
      }

  // If the JSON object does not yet have a stringify method, give it one.

      if (typeof JSON.stringify !== 'function') {
          JSON.stringify = function (value, replacer, space) {

  // The stringify method takes a value and an optional replacer, and an optional
  // space parameter, and returns a JSON text. The replacer can be a function
  // that can replace values, or an array of strings that will select the keys.
  // A default replacer method can be provided. Use of the space parameter can
  // produce text that is more easily readable.

              var i;
              gap = '';
              indent = '';

  // If the space parameter is a number, make an indent string containing that
  // many spaces.

              if (typeof space === 'number') {
                  for (i = 0; i < space; i += 1) {
                      indent += ' ';
                  }

  // If the space parameter is a string, it will be used as the indent string.

              } else if (typeof space === 'string') {
                  indent = space;
              }

  // If there is a replacer, it must be a function or an array.
  // Otherwise, throw an error.

              rep = replacer;
              if (replacer && typeof replacer !== 'function' &&
                      (typeof replacer !== 'object' ||
                      typeof replacer.length !== 'number')) {
                  throw new Error('JSON.stringify');
              }

  // Make a fake root object containing our value under the key of ''.
  // Return the result of stringifying the value.

              return str('', {'': value});
          };
      }


  // If the JSON object does not yet have a parse method, give it one.

      if (typeof JSON.parse !== 'function') {
          JSON.parse = function (text, reviver) {

  // The parse method takes a text and an optional reviver function, and returns
  // a JavaScript value if the text is a valid JSON text.

              var j;

              function walk(holder, key) {

  // The walk method is used to recursively walk the resulting structure so
  // that modifications can be made.

                  var k, v, value = holder[key];
                  if (value && typeof value === 'object') {
                      for (k in value) {
                          if (Object.hasOwnProperty.call(value, k)) {
                              v = walk(value, k);
                              if (v !== undefined) {
                                  value[k] = v;
                              } else {
                                  delete value[k];
                              }
                          }
                      }
                  }
                  return reviver.call(holder, key, value);
              }


  // Parsing happens in four stages. In the first stage, we replace certain
  // Unicode characters with escape sequences. JavaScript handles many characters
  // incorrectly, either silently deleting them, or treating them as line endings.

              text = String(text);
              cx.lastIndex = 0;
              if (cx.test(text)) {
                  text = text.replace(cx, function (a) {
                      return '\\u' +
                          ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                  });
              }

  // In the second stage, we run the text against regular expressions that look
  // for non-JSON patterns. We are especially concerned with '()' and 'new'
  // because they can cause invocation, and '=' because it can cause mutation.
  // But just to be safe, we want to reject all unexpected forms.

  // We split the second stage into 4 regexp operations in order to work around
  // crippling inefficiencies in IE's and Safari's regexp engines. First we
  // replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
  // replace all simple value tokens with ']' characters. Third, we delete all
  // open brackets that follow a colon or comma or that begin the text. Finally,
  // we look to see that the remaining characters are only whitespace or ']' or
  // ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

              if (/^[\],:{}\s]*$/
                      .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
                          .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                          .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

  // In the third stage we use the eval function to compile the text into a
  // JavaScript structure. The '{' operator is subject to a syntactic ambiguity
  // in JavaScript: it can begin a block or an object literal. We wrap the text
  // in parens to eliminate the ambiguity.

                  j = eval('(' + text + ')');

  // In the optional fourth stage, we recursively walk the new structure, passing
  // each name/value pair to a reviver function for possible transformation.

                  return typeof reviver === 'function' ?
                      walk({'': j}, '') : j;
              }

  // If the text is not JSON parseable, then a SyntaxError is thrown.

              throw new SyntaxError('JSON.parse');
          };
      }
  }());
}});
_require.define("runtime/es5_object","runtime/es5_object.js",function(require, module, exports, __filename, __dirname){var slice = Array.prototype.slice.call;

if (!Object.create)
Object.create = function create(proto, props) {
  var Ctor = function Ctor() {
    if (props && Object.defineProperties) Object.defineProperties(this, props);
  };
  Ctor.prototype = proto;
  return new Ctor;
};

if (!Object.keys)
Object.keys = function keys(obj){
  var keys = [];
  for (var k in obj) keys.push(k);
  return keys;
};

if (!Object.getOwnPropertyNames)
Object.getOwnPropertyNames = function getOwnPropertyNames() {
  return Object.keys.apply(this, slice(arguments));
};

if (!Object.getOwnPropertyDescriptor)
Object.getOwnPropertyDescriptor = function getOwnPropertyDescriptor(obj, prop) {
  if (obj.hasOwnProperty(prop)) {
    return {configurable:true, enumerable:true, value:obj[prop],
            writable:true};
  }
};

if (!Object.prototype.hasOwnProperty)
Object.prototype.hasOwnProperty = function (k) {
  return (k in this);
};

if (!Object.defineProperty) {
  // impl 1 -- based on __define{G,S}etter__
  if (Object.prototype.__defineGetter__ && Object.prototype.__defineSetter__) {
    Object.defineProperty = function(obj, prop, desc) {
      if (typeof desc === "object") { // check for desc object
        if (desc.hasOwnProperty("value")) {
          if (!obj.__lookupGetter__(prop) && !obj.__lookupSetter__(prop)) {
            obj[prop] = desc.value; // no pre-existing accessors
          } // todo: else
          if ((desc.hasOwnProperty("get") || desc.hasOwnProperty("set"))) {
            // desc has a value prop but accessor already exists. MSIE throws
            // the following message, so let's do the same:
            throw new TypeError("Object doesn't support this action");
          }
        } else {
          if (typeof desc.get === "function") {
            obj.__defineGetter__(prop, desc.get);
          }
          if (typeof desc.set === "function") {
            obj.__defineSetter__(prop, desc.set);
          }
        }
      }
      return obj;
    };
  }/* DISABLED since this implementation is not complete:
  else {
    // impl 2 -- only set values and throw TypeError for getters/setters
    Object.defineProperty = function (obj, prop, desc) {
      if ((desc.hasOwnProperty("get") || desc.hasOwnProperty("set"))) {
        throw new Error('This runtime does not support dynamic properties');
      }
      if (desc.hasOwnProperty("value")) {
        obj[prop] = desc.value;
      }
    };
  }*/
}

if (!Object.defineProperties && Object.defineProperty)
Object.defineProperties = function (obj, props) {
  for (var prop in props) {
    Object.defineProperty(obj, prop, props[prop]);
  }
};

// Unimplemented Object functions:
// - preventExtensions
// - isExtensible
// - seal
// - isSealed
// - freeze
// - isFrozen

});
_require.define("runtime/es5_string","runtime/es5_string.js",function(require, module, exports, __filename, __dirname){if (!String.prototype.trim)
String.prototype.trim = function trim() {
  return this.replace(/^(?:\s|\u00A0)+/, '').replace(/(?:\s|\u00A0)+$/, '');
};

if (!String.prototype.trimLeft)
String.prototype.trimLeft = function trimLeft() {
  return this.replace(/^(?:\s|\u00A0)+/, '');
};

if (!String.prototype.trimRight)
String.prototype.trimRight = function trimRight() {
  return this.replace(/(?:\s|\u00A0)+$/, '');
};
});
_require.define("runtime","runtime/index.js",function(require, module, exports, __filename, __dirname){require('./runtime_string');

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
});
_require.define("runtime/preprocessors/ehtml","runtime/preprocessors/ehtml.mv",function(require, module, exports, __filename, __dirname){(function(){"use strict";
  var M, _MoveKWArgsT, Text, extend, create, print, repeat, after, JSON, __class, EventEmitter, hasDOM, EHTML, hasClassList;
  M = Move.runtime, _MoveKWArgsT = M._MoveKWArgsT, Text = M.Text, extend = M.extend, create = M.create, print = M.print, repeat = M.repeat, after = M.after, JSON = M.JSON, __class = M.__class, EventEmitter = M.EventEmitter;
  hasDOM = typeof document !== "undefined";
  if (!hasDOM) {
    EHTML = function EHTML(html) {
      html !== null && typeof html === "object" && html.__kw === _MoveKWArgsT && (arguments.keywords = html, html = html.html);
      return {
        innerHTML: html
      };
    };
    return;
  }
  EHTML = function EHTML(html) {
    html !== null && typeof html === "object" && html.__kw === _MoveKWArgsT && (arguments.keywords = html, html = html.html);
    var el;
    if (!EHTML.spawnerElement) EHTML.spawnerElement = document.createElement("div");
    EHTML.spawnerElement.innerHTML = html;
    el = EHTML.spawnerElement.firstChild;
    return el;
  };
  Move.EHTML = EHTML;
  hasClassList = document.body && document.body.classList;
  if (hasClassList) {
    EHTML.createViewImpl = function createViewImpl() {
      var el;
      if (this.createView) {
        el = this.createView.apply(this, arguments);
        if (el && el instanceof Element) el.classList.add(this.__domid);
      }
      return el;
    };
  } else {
    EHTML.createViewImpl = function createViewImpl() {
      var el;
      if (this.createView) {
        el = this.createView.apply(this, arguments);
        if (el && el instanceof Element) el.className += " " + this.__domid;
      }
      return el;
    };
  }
  if (hasClassList) {
    return EHTML.classNameWrapper = function classNameWrapper(className) {
      className !== null && typeof className === "object" && className.__kw === _MoveKWArgsT && (arguments.keywords = className, className = className.className);
      return function (html) {
        html !== null && typeof html === "object" && html.__kw === _MoveKWArgsT && (arguments.keywords = html, html = html.html);
        var node;
        if (node = Move.EHTML(html)) node.classList.add(className);
        return node;
      };
    };
  } else {
    return EHTML.classNameWrapper = function classNameWrapper(className) {
      className !== null && typeof className === "object" && className.__kw === _MoveKWArgsT && (arguments.keywords = className, className = className.className);
      className = " " + className;
      return function (html) {
        html !== null && typeof html === "object" && html.__kw === _MoveKWArgsT && (arguments.keywords = html, html = html.html);
        var node;
        if (node = Move.EHTML(html)) node.className += className;
        return node;
      };
    };
  }
})();});
_require.define("runtime/runtime_array","runtime/runtime_array.js",function(require, module, exports, __filename, __dirname){// unique() -> list
if (typeof Array.prototype.unique !== 'function')
Array.prototype.unique = function unique() {
  var a = [], i, j, l = this.length;
  for (i=0; i<l; ++i) {
    for (j=i+1; j<l; ++j) {
      if (this[i] === this[j]) {
        j = ++i;
      }
    }
    a.push(this[i]);
  }
  return a;
};

// list[startIndex:endIndex] = value -> list
// _move_setSlice(startIndex, endIndex=@length, value) -> list
if (typeof Array.prototype._move_setSlice != 'function') {
  var _splice = Array.prototype.splice;
  Array.prototype._move_setSlice =
  function _move_setSlice(startIndex, endIndex, value) {
    // splice(index, howMany[, element1[, ...[, elementN]]]) → list
    var length;
    if (endIndex !== undefined) {
      if (typeof endIndex !== 'number')
        throw new TypeError('Second argument must be a number');
      length = endIndex - startIndex;
    } else {
      length = this.length;
    }
    return _splice.apply(this, [startIndex, length].concat(value));
  };
}
});
_require.define("runtime/runtime_class","runtime/runtime_class.mv",function(require, module, exports, __filename, __dirname){(function(){"use strict";
  var M, _MoveKWArgsT, Text, extend, create, print, repeat, after, JSON, __class, EventEmitter, kObjectConstructor, kProtoKey, __class;
  M = Move.runtime, _MoveKWArgsT = M._MoveKWArgsT, Text = M.Text, extend = M.extend, create = M.create, print = M.print, repeat = M.repeat, after = M.after, JSON = M.JSON, __class = M.__class, EventEmitter = M.EventEmitter;
  kObjectConstructor = Object.prototype.constructor;
  kProtoKey = typeof Object.prototype.__proto__ === "object" ? "__proto__" : "prototype";
  exports.__class = __class = function __class() {
    var T, parent, prototype, t, p;
    T = arguments[0];
    if (arguments.length === 3) {
      parent = arguments[1];
      prototype = arguments[2];
      if ((t = typeof prototype) !== "object" && t !== "function") throw TypeError("unexpected type " + t + " of second argument (expected object)");
    } else if (arguments.length === 2) {
      prototype = arguments[1];
      if ((t = typeof prototype) === "function") {
        parent = prototype;
        prototype = undefined;
      } else if (t !== "object") {
        throw TypeError("unexpected type " + t + " of first argument (expected object or function)");
      }
    }
    if (prototype && prototype.__kw === _MoveKWArgsT) delete prototype.__kw;
    if (parent) {
      p = Object.create(parent.prototype || null);
      if (prototype) {
        Object.keys(prototype).forEach(function (key) {
          key !== null && typeof key === "object" && key.__kw === _MoveKWArgsT && (arguments.keywords = key, key = key.key);
          var value;
          if ((value = prototype[key]) !== undefined) return p[key] = value;
        });
      }
      prototype = p;
    }
    T.prototype = prototype || null;
    T.constructor = undefined;
    return T;
  };
  return __class.create = function create() {
    var T, args, object, ctor;
    T = arguments[0];
    args = arguments[1];
    object = Object.create(T.prototype);
    if ((ctor = object.constructor) && ctor !== kObjectConstructor && typeof ctor === "function") {
      ctor.apply(object, args);
    } else if (typeof args[0] === "object") {
      extend(object, args[0]);
    }
    return object;
  };
})();});
_require.define("runtime/runtime_date","runtime/runtime_date.mv",function(require, module, exports, __filename, __dirname){(function(){"use strict";
  var M, _MoveKWArgsT, Text, extend, create, print, repeat, after, JSON, __class, EventEmitter;
  M = Move.runtime, _MoveKWArgsT = M._MoveKWArgsT, Text = M.Text, extend = M.extend, create = M.create, print = M.print, repeat = M.repeat, after = M.after, JSON = M.JSON, __class = M.__class, EventEmitter = M.EventEmitter;
  if (Date.distantFuture === undefined) Date.distantFuture = new Date(359753450957352);
  if (Date.distantPast === undefined) Date.distantPast = new Date(-621356868e5);
  if (!Date.nowUTC) Date.nowUTC = function nowUTC() {
    return (new Date).getUTCTime();
  };
  if (!Date.prototype.getUTCTime) Date.prototype.getUTCTime = function getUTCTime() {
    return this.getTime() - this.getTimezoneOffset();
  };
  if (!Date.prototype.getUTCComponents) return Date.prototype.getUTCComponents = function getUTCComponents() {
    return [ this.getUTCFullYear(), this.getUTCMonth() + 1, this.getUTCDate(), this.getUTCHours(), this.getUTCMinutes(), this.getUTCSeconds(), this.getUTCMilliseconds() ];
  };
})();});
_require.define("runtime/runtime_events","runtime/runtime_events.mv",function(require, module, exports, __filename, __dirname){(function(){"use strict";
  var M, _MoveKWArgsT, Text, extend, create, print, repeat, after, JSON, __class, EventEmitter;
  M = Move.runtime, _MoveKWArgsT = M._MoveKWArgsT, Text = M.Text, extend = M.extend, create = M.create, print = M.print, repeat = M.repeat, after = M.after, JSON = M.JSON, __class = M.__class, EventEmitter = M.EventEmitter;
  EventEmitter = exports.EventEmitter = __class(EventEmitter = function EventEmitter() {
    return __class.create(EventEmitter, arguments);
  }, {
    on: function (event, invoke) {
      event !== null && typeof event === "object" && event.__kw === _MoveKWArgsT && (arguments.keywords = event, invoke = event.invoke, event = event.event);
      var listeners;
      if (!this.eventListeners) {
        Object.defineProperty(this, "eventListeners", {
          value: {}
        });
        return this.eventListeners[event] = [ invoke ];
      } else if (!(listeners = this.eventListeners[event])) {
        return this.eventListeners[event] = [ invoke ];
      } else {
        return listeners.push(invoke);
      }
    },
    emit: function () {
      var event, listeners, args, i, L;
      event = arguments[0];
      if (this.eventListeners && (listeners = this.eventListeners[event])) {
        args = Array.prototype.slice.call(arguments, 1);
        for (i = 0, L = listeners.length; i < L; ++i) {
          listeners[i] && listeners[i].apply(this, args);
        }
      }
    },
    removeEventListener: function (event, callback) {
      event !== null && typeof event === "object" && event.__kw === _MoveKWArgsT && (arguments.keywords = event, callback = event.callback, event = event.event);
      var listeners, i;
      if (this.eventListeners) {
        if (callback && (listeners = this.eventListeners[event])) {
          i = listeners.indexOf(callback);
          return listeners.splice(i, 1);
        } else {
          return this.eventListeners[event] = undefined;
        }
      }
    }
  });
  return exports.EventEmitter.enableFor = function enableFor(object) {
    object !== null && typeof object === "object" && object.__kw === _MoveKWArgsT && (arguments.keywords = object, object = object.object);
    return extend(object, exports.EventEmitter.prototype);
  };
})();});
_require.define("runtime/runtime_inspect","runtime/runtime_inspect.js",function(require, module, exports, __filename, __dirname){/**
 * Copyright 2009, 2010 Ryan Lienhart Dahl. All rights reserved.
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Boolean} showHidden Flag that shows hidden (not enumerable)
 *    properties of objects.
 * @param {Number} depth Depth in which to descend in object. Default is 2.
 * @param {Boolean} colors Flag to turn on ANSI escape codes to color the
 *    output. Default is false (no coloring).
 */
exports.inspect = function(obj, showHidden, depth, colors) {
  var seen = [];

  var /*stylize = function(str, styleType) {
    // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
    var styles =
        { 'bold' : [1, 22],
          'italic' : [3, 23],
          'underline' : [4, 24],
          'inverse' : [7, 27],
          'white' : [37, 39],
          'grey' : [90, 39],
          'black' : [30, 39],
          'blue' : [34, 39],
          'cyan' : [36, 39],
          'green' : [32, 39],
          'magenta' : [35, 39],
          'red' : [31, 39],
          'yellow' : [33, 39] };

    var style =
        { 'special': 'cyan',
          'number': 'blue',
          'boolean': 'yellow',
          'undefined': 'grey',
          'null': 'bold',
          'string': 'green',
          'date': 'magenta',
          // "name": intentionally not styling
          'regexp': 'red' }[styleType];

    if (style) {
      return '\033[' + styles[style][0] + 'm' + str +
             '\033[' + styles[style][1] + 'm';
    } else {
      return str;
    }
  };
  if (! colors) {*/
    stylize = function(str, styleType) { return str; };
  //}

  function format(value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (value && typeof value.inspect === 'function' &&
        // Filter out the util module, it's inspect function is special
        value !== exports && value.inspect !== exports.inspect &&
        // Also filter out any prototype objects using the circular check.
        !(value.constructor && value.constructor.prototype === value)) {
      return value.inspect(recurseTimes);
    }

    // Primitive types cannot have properties
    switch (typeof value) {
      case 'undefined':
        return stylize('undefined', 'undefined');

      case 'string':
        var simple = JSON.stringify(value).replace(/'/g, "\\'")
                                          .replace(/\\"/g, '"')
                                          .replace(/(^"|"$)/g, "'");
        return stylize(simple, 'string');

      case 'number':
        return stylize('' + value, 'number');

      case 'boolean':
        return stylize('' + value, 'boolean');
    }
    // For some reason typeof null is "object", so special case here.
    if (value === null) {
      return stylize('null', 'null');
    }

    // Look up the keys of the object.
    var visible_keys = Object.keys(value);
    var keys = showHidden ? Object.getOwnPropertyNames(value) : visible_keys;

    // Functions without properties can be shortcutted.
    if (typeof value === 'function' && keys.length === 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        var name = value.name ? ': ' + value.name : '';
        return stylize('[Function' + name + ']', 'special');
      }
    }

    // Dates without properties can be shortcutted
    if (isDate(value) && keys.length === 0) {
      return stylize(value.toUTCString(), 'date');
    }

    var base, type, braces;
    // Determine the object type
    if (isArray(value)) {
      type = 'Array';
      braces = ['[', ']'];
    } else {
      type = 'Object';
      braces = ['{', '}'];
    }

    // Make functions say that they are functions
    if (typeof value === 'function') {
      var n = value.name ? ': ' + value.name : '';
      base = (isRegExp(value)) ? ' ' + value : ' [Function' + n + ']';
    } else {
      base = '';
    }

    // Make dates with properties first say the date
    if (isDate(value)) {
      base = ' ' + value.toUTCString();
    }

    if (keys.length === 0) {
      return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        return stylize('[Object]', 'special');
      }
    }

    seen.push(value);

    var output = keys.map(function(key) {
      var name, str;
      if (value.__lookupGetter__) {
        if (value.__lookupGetter__(key)) {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Getter/Setter]', 'special');
          } else {
            str = stylize('[Getter]', 'special');
          }
        } else {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Setter]', 'special');
          }
        }
      }
      if (visible_keys.indexOf(key) < 0) {
        name = '[' + key + ']';
      }
      if (!str) {
        if (seen.indexOf(value[key]) < 0) {
          if (recurseTimes === null) {
            str = format(value[key]);
          } else {
            str = format(value[key], recurseTimes - 1);
          }
          if (str.indexOf('\n') > -1) {
            if (isArray(value)) {
              str = str.split('\n').map(function(line) {
                return '  ' + line;
              }).join('\n').substr(2);
            } else {
              str = '\n' + str.split('\n').map(function(line) {
                return '   ' + line;
              }).join('\n');
            }
          }
        } else {
          str = stylize('[Circular]', 'special');
        }
      }
      if (typeof name === 'undefined') {
        if (type === 'Array' && key.match(/^\d+$/)) {
          return str;
        }
        name = JSON.stringify('' + key);
        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
          name = name.substr(1, name.length - 2);
          name = stylize(name, 'name');
        } else {
          name = name.replace(/'/g, "\\'")
                     .replace(/\\"/g, '"')
                     .replace(/(^"|"$)/g, "'");
          name = stylize(name, 'string');
        }
      }

      return name + ': ' + str;
    });

    seen.pop();

    var numLinesEst = 0;
    var length = output.reduce(function(prev, cur) {
      numLinesEst++;
      if (cur.indexOf('\n') >= 0) numLinesEst++;
      return prev + cur.length + 1;
    }, 0);

    if (length > (/*require('readline').columns ||*/ 50)) {
      output = braces[0] +
               (base === '' ? '' : base + '\n ') +
               ' ' +
               output.join(',\n  ') +
               ' ' +
               braces[1];

    } else {
      output = braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
    }

    return output;
  }
  return format(obj, (typeof depth === 'undefined' ? 2 : depth));
};


function isArray(ar) {
  return ar instanceof Array ||
         Array.isArray(ar) ||
         (ar && ar !== Object.prototype && isArray(ar.prototype));
}


function isRegExp(re) {
  var s = '' + re;
  return re instanceof RegExp || // easy case
         // duck-type for context-switching evalcx case
         typeof(re) === 'function' &&
         re.constructor.name === 'RegExp' &&
         re.compile &&
         re.test &&
         re.exec &&
         s.match(/^\/.*\/[gim]{0,3}$/);
}


function isDate(d) {
  if (d instanceof Date) return true;
  if (typeof d !== 'object') return false;
  var properties = Date.prototype && Object.getOwnPropertyNames(Date.prototype);
  var proto = d.__proto__ && Object.getOwnPropertyNames(d.__proto__);
  return JSON.stringify(proto) === JSON.stringify(properties);
}
});
_require.define("runtime/runtime_move","runtime/runtime_move.mv",function(require, module, exports, __filename, __dirname){(function(){"use strict";
  var M, _MoveKWArgsT, Text, extend, create, print, repeat, after, JSON, __class, EventEmitter, IS_KNOWN_ES5_HOST, defineConstant, extend, create, repeat, after, _JSON;
  M = Move.runtime, _MoveKWArgsT = M._MoveKWArgsT, Text = M.Text, extend = M.extend, create = M.create, print = M.print, repeat = M.repeat, after = M.after, JSON = M.JSON, __class = M.__class, EventEmitter = M.EventEmitter;
  _MoveKWArgsT = global.Move.runtime._MoveKWArgsT;
  IS_KNOWN_ES5_HOST = !!(typeof process !== "undefined" && (typeof process.versions === "object" && process.versions.node || process.pid));
  if (!IS_KNOWN_ES5_HOST) {
    require("./es5_object");
    require("./es5_array");
    require("./es5_date");
    require("./es5_json");
  }
  require("./runtime_object");
  require("./runtime_string");
  require("./runtime_date");
  require("./runtime_array");
  if (Object.defineProperty) {
    defineConstant = function defineConstant(obj, name, value) {
      obj !== null && typeof obj === "object" && obj.__kw === _MoveKWArgsT && (arguments.keywords = obj, value = obj.value, name = obj.name, obj = obj.obj);
      return Object.defineProperty(obj, name, {
        value: value,
        writable: false,
        enumerable: true,
        configurable: false
      });
    };
  } else {
    defineConstant = function defineConstant(obj, name, value) {
      obj !== null && typeof obj === "object" && obj.__kw === _MoveKWArgsT && (arguments.keywords = obj, value = obj.value, name = obj.name, obj = obj.obj);
      return obj[name] = value;
    };
  }
  defineConstant(exports, "_MoveKWArgsT", _MoveKWArgsT);
  defineConstant(exports, "Text", String);
  String.prototype.toText = String.prototype.toString;
  exports.extend = extend = function extend(object, body, onlyOwnProperties) {
    object !== null && typeof object === "object" && object.__kw === _MoveKWArgsT && (arguments.keywords = object, onlyOwnProperties = object.onlyOwnProperties, body = object.body, object = object.object);
    var T;
    T = body === null ? "undefined" : typeof body;
    if (T === "object" || T === "function") {
      Object.prototype.forEach.call(body, function (key, value) {
        key !== null && typeof key === "object" && key.__kw === _MoveKWArgsT && (arguments.keywords = key, value = key.value, key = key.key);
        if (value !== undefined && value !== _MoveKWArgsT) return object[key] = value;
      }, null, onlyOwnProperties);
    } else if (T !== "undefined") {
      throw new TypeError('"body" argument must be either an object or a function, not a ' + T);
    }
    return object;
  };
  exports.create = create = function create(prototype, body) {
    prototype !== null && typeof prototype === "object" && prototype.__kw === _MoveKWArgsT && (arguments.keywords = prototype, body = prototype.body, prototype = prototype.prototype);
    return extend(Object.create(prototype), body);
  };
  if (typeof Object.inspect !== "function") {
    try {
      Object.inspect = require("util").inspect;
      if (typeof Object.inspect !== "function") throw 1;
    } catch (e) {
      Object.inspect = require("./runtime_inspect").inspect;
    }
  }
  if (typeof console !== "undefined" && console.log) {
    if (typeof window !== "undefined") {
      exports.print = function print() {
        return console.log.apply(console, Array.prototype.slice.call(arguments));
      };
    } else {
      exports.print = console.log;
    }
  } else {
    exports.print = function print() {};
  }
  exports.dprinter = function dprinter(module) {
    module !== null && typeof module === "object" && module.__kw === _MoveKWArgsT && (arguments.keywords = module, module = module.module);
    return function () {
      return exports.print.apply(null, [ "[" + module.id + "]" ].concat(Array.prototype.slice.call(arguments)));
    };
  };
  exports.repeat = repeat = function repeat(times, every, block) {
    times !== null && typeof times === "object" && times.__kw === _MoveKWArgsT && (arguments.keywords = times, block = times.block, every = times.every, times = times.times);
    var i, timer;
    if (typeof times === "function") {
      while (true) if (!times()) break;
      return;
    }
    if (typeof block === "function") {
      if (times !== undefined) {
        for (i = 0; i < times; ++i) if (block(i) === true) break;
      } else if (every !== undefined) {
        timer = Object.create({}, {
          cancel: {
            value: function () {
              return clearInterval(this.id);
            }
          }
        });
        timer.id = setInterval(function () {
          return block(timer);
        }, every);
        return timer;
      } else {
        while (true) if (!block()) break;
      }
    } else {
      return function (block) {
        block !== null && typeof block === "object" && block.__kw === _MoveKWArgsT && (arguments.keywords = block, block = block.block);
        if (times !== undefined) {
          for (i = 0; i < times; ++i) if (block(i) === true) break;
        } else if (every !== undefined) {
          timer = Object.create({}, {
            cancel: {
              value: function () {
                return clearInterval(this.id);
              }
            }
          });
          timer.id = setInterval(function () {
            return block(timer);
          }, every);
          return timer;
        } else {
          while (true) if (!block()) break;
        }
      };
    }
  };
  exports.after = after = function after(delay, date, target) {
    delay !== null && typeof delay === "object" && delay.__kw === _MoveKWArgsT && (arguments.keywords = delay, target = delay.target, date = delay.date, delay = delay.delay);
    if (delay) {
      if (typeof delay !== "number") throw new TypeError('"delay" argument must be a number');
    } else if (date) {
      if (typeof date === "string" || typeof date === "number") {
        date = new Date(date);
        if (isNaN(date.getTime())) throw new Error('Invalid date/time passed for "date" argument');
      } else if (typeof date !== "object" || !(date instanceof Date)) {
        throw new TypeError('"date" argument must be a Date object or a string');
      }
      delay = Math.max(0, date.getTime() - (new Date).getTime());
    }
    return function (block) {
      block !== null && typeof block === "object" && block.__kw === _MoveKWArgsT && (arguments.keywords = block, block = block.block);
      var b;
      if (target) {
        b = function b() {
          return block.apply(target, arguments);
        };
      } else {
        b = block;
      }
      return setTimeout(b, delay);
    };
  };
  JSON = global.JSON;
  _JSON = function _JSON(build, parse) {
    build !== null && typeof build === "object" && build.__kw === _MoveKWArgsT && (arguments.keywords = build, parse = build.parse, build = build.build);
    if (build !== undefined || parse === undefined) return JSON.stringify(build); else return JSON.parse(parse);
  };
  _JSON.parse = JSON.parse;
  _JSON.stringify = JSON.stringify;
  exports.JSON = _JSON;
  global.Move.runtime = exports;
  exports.__class = require("./runtime_class").__class;
  return exports.EventEmitter = require("./runtime_events").EventEmitter;
})();});
_require.define("runtime/runtime_object","runtime/runtime_object.js",function(require, module, exports, __filename, __dirname){if (!Object.prototype.forEach) {
  var forEach = function forEach(block, ctx, onlyOwnProperties) {
    if (!ctx || (typeof ctx !== 'object' && typeof ctx !== 'function'))
      ctx = this;
    if (typeof block !== 'function')
      throw new TypeError('First argument is not a function');
    var obj = this, key;
    if (onlyOwnProperties) {
      Object.keys(this).forEach(function (key) {
        block.call(ctx, key, obj[key], obj);
      });
    } else {
      for (key in this) block.call(ctx, key, obj[key], obj);
    }
    return this;
  };
  if (Object.defineProperty) {
    Object.defineProperty(Object.prototype, 'forEach', {value:forEach});
  } else {
    // not good -- might break old for (key in object) iterations.
    // It's better not to include this feature than to break things.
    //Object.prototype.forEach = forEach;
  }
}
});
_require.define("runtime/runtime_string","runtime/runtime_string.js",function(require, module, exports, __filename, __dirname){if (!String.prototype.repeat)
String.prototype.repeat = function repeat(times) {
  s = ''; while (times--) s += this
  return s;
};

if (!String.prototype.padLeft)
String.prototype.padLeft = function padLeft(length, padstr) {
  if (this.length >= length) return this;
  return String(padstr || " ").repeat(length-this.length) + this;
};

if (!String.prototype.padRight)
String.prototype.padRight = function padRight(length, padstr) {
  if (this.length >= length) return this;
  return this + String(padstr || " ").repeat(length-this.length);
};

// Levenshtein edit distance by Carlos R. L. Rodrigues
if (!String.prototype.editDistance)
String.prototype.editDistance = function editDistance(otherString) {
  var s, l = (s = this.split("")).length,
      t = (otherString = otherString.split("")).length, i, j, m, n;
  if(!(l || t)) return Math.max(l, t);
  for(var a = [], i = l + 1; i; a[--i] = [i]);
  for(i = t + 1; a[0][--i] = i;);
  for(i = -1, m = s.length; ++i < m;) {
    for(j = -1, n = otherString.length; ++j < n;) {
      a[(i *= 1) + 1][(j *= 1) + 1] = Math.min(a[i][j + 1] + 1,
        a[i + 1][j] + 1, a[i][j] + (s[i] != otherString[j]));
    }
  }
  return a[l][t];
};

// Return all parts of the receiver which matches regexp `pattern`
if (!String.prototype.matchAll)
String.prototype.matchAll = function matchAll(pattern) {
  "use strict";
  if (!(pattern instanceof RegExp)) {
    pattern = new RegExp(pattern, 'g');
  } else if (!pattern.global) {
    pattern = new RegExp(pattern.source, 'g');
  }
  var match, matches = [];
  while (match = pattern.exec(this)) {
    matches.push(match);
  }
  return matches;
};

// Iterate over the receiver for matches of regexp `pattern`
if (!String.prototype.forEachMatch)
String.prototype.forEachMatch = function forEachMatch(pattern, iterfun, thisObject) {
  "use strict";
  if (!thisObject) thisObject = this;
  this.matchAll(pattern).forEach(iterfun, thisObject);
  return thisObject;
};

// Use locale-aware case conversion if available
if (typeof String.prototype.toLocaleLowerCase === 'function')
  String.prototype.toLowerCase = String.prototype.toLocaleLowerCase;
if (typeof String.prototype.toLocaleUpperCase === 'function')
  String.prototype.toUpperCase = String.prototype.toLocaleUpperCase;
});
_require.define("runtime/symbols","runtime/symbols.js",function(require, module, exports, __filename, __dirname){// _MoveKWArgsT represents keyword arguments and is used for detection
exports._MoveKWArgsT = function _MoveKWArgsT(obj) {
  obj.__kw = _MoveKWArgsT;
  return obj;
};});


_require('');
var move = global.Move;

// --------------------------------------------------------------
move.version = function () { return "0.4.5"; };

// --------------------------------------------------------------
move.require = Require();


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
        if (script.src) {
          opts.filename = script.src;
          opts.moduleStub = true;
          move.compileURL(opts.filename, opts, function (err, jscode) {
            jscode = wrapAsModule(jscode, script.getAttribute('src'), opts.filename);
            completeQ[qIndex] = [err, jscode, opts.filename, script];
            decr();
          });
        } else {
          var id = script.getAttribute('module');
          opts.filename = '<script module="'+id+'">';
          try {
            // TODO: rip out into public function
            jscode = move.compileModule(script.innerHTML, id, null, false, opts);
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


return move;
})();