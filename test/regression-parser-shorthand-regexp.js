var assert = require('assert');
var move = require('../lib');

var source = 'myfun = ^(re) { true }\n'+
             'myfun /^[a-z]/';

var jscode = move.compile(source, {raw:true});
//console.log('output -> '+jscode);
assert.ok(jscode.indexOf('myfun(/^[a-z]/)') !== -1);
