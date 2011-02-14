var parser = require("./parse-js");
var processor = require("./process");

// AST modifier which adds implicit returns to the last statemenet of a function
exports.add_implicit_returns = function add_implicit_returns(ast) {
  var w = processor.ast_walker(), MAP = processor.MAP;
  function _lambda(name, args, body) {
    if (body.length && body[body.length-1][0] === 'stat') {
      body[body.length-1][0] = 'return';
    }
    return [ this[0], name, args.slice(), MAP(body, w.walk) ];
  }
  var ret = w.with_walkers({
    "defun": _lambda,
    "function": _lambda
  }, function(){
    return w.walk(ast);
  });
  return ret;
}


// AST modifier which declares first-time assignments as vars
exports.first_time_var_delc = function first_time_var_delc(ast) {
  var w = processor.ast_walker(), MAP = processor.MAP, Scope = processor.Scope;
  var current_scope = null, slice = parser.slice;
  
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
  
  function _lambda(name, args, body) {
    return [ this[0], define(name), args, with_new_scope(function(){
      MAP(args, define);
      return MAP(body, w.walk);
    })];
  }
  
  return with_new_scope(function(){
    var ret = w.with_walkers({
      "defun": _lambda,
      "function": _lambda,
      "var": function(defs) {
        var subs = ['assign', true];
        MAP(defs, function(d){
          define(d[0]);
          current_scope.vars.push(d[0]);
          subs.push(['name', d[0]]);
          subs.push(d[1]);
        })
        return ['stat', subs];
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
      /*"seq": function() {
        var vardelc, subs = MAP(slice(arguments), function(node) {
          var r = w.walk(node);
          if (r[0] === 'var') {
            if (!vardelc) {
              vardelc = r;
            } else {
              vardelc[1] = vardelc[1].concat(r[1]);
            }
          }
          return r;
        });
        return vardelc || [ this[0] ].concat(subs);
      },*/
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
      }
    }, function(){
      return w.walk(ast);
    });
    return ret;
  });
}


// AST modifier which give a anonymous function expression name from assignment
exports.named_lambda_assignments = function named_lambda_assignments(ast) {
  var w = processor.ast_walker(), MAP = processor.MAP;
  var subNameRE = /^[_\$a-z][_\$\w\d]*$/i;
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
      if (rvalue[0] === 'function' && !rvalue[1]) {
        if (lvalue[0] === 'name') {
          rvalue[1] = lvalue[1];
        } else if (lvalue[0] === 'dot') {
          rvalue[1] = lvalue[lvalue.length-1];
        } else if (lvalue[0] === 'sub' && lvalue[2][0] === 'string') {
          var name = lvalue[2][1];
          if (!parser.KEYWORDS[name] && !parser.RESERVED_WORDS[name] &&
              subNameRE.test(name)) {
            rvalue[1] = name;
          }
        }/* else {
          console.log('lvalue', lvalue);
          console.log('rvalue', rvalue);
        }*/
      }
      return [ this[0], op, w.walk(lvalue), w.walk(rvalue) ];
    },
  }, function(){
    return w.walk(ast);
  });
  return ret;
}


// AST modifier which converts type-coercing comparison operators to regular,
// strict operators (i.e. "==" -> "===" and "!=" -> "!==")
exports.enforce_strict_eq_ops = function enforce_strict_eq_ops(ast) {
  var w = processor.ast_walker(), MAP = processor.MAP;
  var subNameRE = /^[_\$a-z][_\$\w\d]*$/i;
  var ret = w.with_walkers({
    "binary": function(op, left, right) {
      if (op === '==') op = '===';
      else if (op === '!=') op = '!==';
      return [ this[0], op, w.walk(left), w.walk(right) ];
    },
  }, function(){
    return w.walk(ast);
  });
  return ret;
}
