var assert = require('assert');
var move = require('../lib');
var source = 'x = 10\n'+
             'while (x) {\n'+
             '  print "x =", x\n'+
             '  x -= 1\n'+
             '}';

// optimizationLevel 0
var res = move.compile(source, {detailedOutput: true, optimizationLevel:0});
assert.ok(res.code.indexOf('while (x)') !== -1);

// optimizationLevel 1 -- this is where issue #3 was found
res = move.compile(source, {detailedOutput: true, optimizationLevel:1});
assert.ok(res.code.indexOf('while (x)') !== -1);
