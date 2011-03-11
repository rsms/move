var parser = require("./parser");
var processor = require("./process");
var array_to_hash = require("./util").array_to_hash;

// AST modifier which adds implicit returns to the last statement of a function
exports.add_implicit_returns = function add_implicit_returns(ast) {
  var w = processor.ast_walker(), MAP = processor.MAP;
  
  var wrapStatement = function (statement) {
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
    current_scope.names = array_to_hash(globals);
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
        if (lvalue[0] === 'name') {
          rvalue[1] = lvalue[1];
        } else if (lvalue[0] === 'dot') {
          rvalue[1] = lvalue[lvalue.length-1];
        } else if (lvalue[0] === 'sub' && lvalue[2][0] === 'string') {
          var name = lvalue[2][1];
          if (!parser.KEYWORDS[name] && !parser.RESERVED_WORDS[name] &&
              DOT_NAME_RE.test(name)) {
            rvalue[1] = name;
          }
        }/* else {
          console.log('lvalue', lvalue);
          console.log('rvalue', rvalue);
        }*/
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
  else if (options.raw) {
    
  }
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
