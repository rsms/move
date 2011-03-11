var assert = require('assert');
var move = require('../lib');
var res, source = 'for (k in x) print k';

// This is a test for a bug fixed in 0.2.2 where a first-time defined variable
// in a for-in statement would not get automatically declared. Also, a for-in
// statement would cause an AST processor exception in those cases.

res = move.compile(source, {detailedOutput: true, optimizationLevel:0});
// k should be declared
assert.equal(/var .+ k;/.test(res.code), true);
// the for-in should look like this
assert.notEqual(res.code.indexOf("for (k in x)"), -1);
