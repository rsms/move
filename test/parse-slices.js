// Tests parsing of slices (e.g. x[1:2])
var assert = require('assert');
var move = require('../lib');
var res, compilerOptions = {raw: 1};

res = move.compile('x = foo[1]', compilerOptions);
assert.notEqual(res.indexOf('x = foo[1]'), -1);

res = move.compile('x = foo.slice(1, 2)', compilerOptions);
assert.notEqual(res.indexOf('x = foo.slice(1, 2)'), -1);

res = move.compile('x = foo[1:2]', compilerOptions);
assert.notEqual(res.indexOf('x = foo.slice(1, 2)'), -1);

res = move.compile('x = foo[1:]', compilerOptions);
assert.notEqual(res.indexOf('x = foo.slice(1)'), -1);

res = move.compile('x = foo[:2]', compilerOptions);
assert.notEqual(res.indexOf('x = foo.slice(0, 2)'), -1);

res = move.compile('x = foo[:]', compilerOptions);
assert.notEqual(res.indexOf('x = foo.slice(0)'), -1);

// slice-write
res = move.compile('foo[1:2] = [1,2,3]\nx = 5', compilerOptions);
assert.notEqual(res.indexOf('foo._move_setSlice(1, 2, [ 1, 2, 3 ])'), -1);

