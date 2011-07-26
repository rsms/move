var assert = require('assert'),
    util = require('util'),
    move = require('../lib'), r;
inspect = function (obj) { return util.inspect(obj, false, 40); }
assertContainsCode = function (r, code) {
  assert.ok(r.code.indexOf(code) !== -1, JSON.stringify(code)+' expected but not found');
};
global.movedebug = true

/*
This asserts that the following bug has been fixed:

    foo = bar
    ++x

Parsed as "foo = bar++x". Should be parsed as "foo = bar; ++x"
*/

r = move.compile('foo = bar\n++x', {raw:true, detailedOutput:true});
//console.log(inspect(r))
assertContainsCode(r, 'foo = bar;');
assertContainsCode(r, '++x;');

r = move.compile('foo = bar\n--x', {raw:true, detailedOutput:true});
assertContainsCode(r, 'foo = bar;');
assertContainsCode(r, '--x;');
