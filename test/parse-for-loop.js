var assert = require('assert'), move = require('../lib');
var res;
var compile = function compile(code) { return move.compile(code, {
  raw: 1, detailedOutput:true}); };

r = compile('for i in items {\n'+
  '  print i\n'+
  '}');
assert.notEqual(r.code.indexOf('for (i in items) {'), -1);

// With parenthesis should yield the same code
assert.equal(compile('for (i in items) {\n'+
  '  print i\n'+
  '}').code, r.code);

// Implicit block with linebreak
r = compile('for i in items\nprint i')
assert.notEqual(r.code.indexOf('for (i in items) print(i)'), -1);

// Implicit block without linebreak
r = compile('for i in items print i')
assert.notEqual(r.code.indexOf('for (i in items) print(i)'), -1);

// unary prefix of last component
r = compile('for i=0; i < 5; ++i { print i }');
assert.notEqual(r.code.indexOf('for (i = 0; i < 5;'), -1);

// unary postfix of last component -- BROKEN but it's OK
/*global.movedebug = true;
r = compile('for i=0; i < 5; i++ {\n'+
  '  print i\n'+
  '}');
console.log(r.code, r.ast);
assert.notEqual(r.code.indexOf('for (i = 0; i < 5;'), -1);*/

// unary postfix of last component wrapped in parenthesis
r = compile('for (i=0; i < 5; i++) { print i }');
assert.notEqual(r.code.indexOf('for (i = 0; i < 5;'), -1);
