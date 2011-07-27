var assert = require('assert'),
    util = require('util'),
    move = require('../lib'), r;
inspect = function (obj) { return util.inspect(obj, false, 40); }
assertContainsCode = function (r, code) {
  assert.ok(r.code.indexOf(code) !== -1, JSON.stringify(code)+' expected but not found');
};

/*
This asserts that the following bug has been fixed:

    foo bar
    (x) && x()

Which incorrectly parse as "foo(bar(x) && x())" when it should parse as "foo(bar); x && x()"
*/

r = move.compile('foo bar\n(x) && x()', {raw:true, detailedOutput:true});
//console.log(inspect(r))
assertContainsCode(r, 'foo(bar)');

r = move.compile('foo bar,\n{x:1}', {raw:true, detailedOutput:true});
//console.log(inspect(r))
assertContainsCode(r, 'foo(bar, {');

r = move.compile('a = {x: foo(bar),\ny: foo(baz)\n}', {raw:true, detailedOutput:true});
r.code = r.code.replace(/\s+/g, '');
//console.log(inspect(r));
assertContainsCode(r, 'a={x:foo(bar),y:foo(baz)}');

// like above but with spare comma at the end which should be ignored
r = move.compile('a = {x: foo(bar),\ny: foo(baz),\n}', {raw:true, detailedOutput:true});
r.code = r.code.replace(/\s+/g, '');
//console.log(inspect(r));
assertContainsCode(r, 'a={x:foo(bar),y:foo(baz)}');

// like above, but as keyword arguments
r = move.compile('a {x: foo(bar),\ny: foo(baz)\n}', {raw:true, detailedOutput:true});
r.code = r.code.replace(/\s+/g, '');
assertContainsCode(r, 'a({x:foo(bar),y:foo(baz)');

// like above but with shorthand call style
r = move.compile('a = {x: foo bar,\ny: foo baz\n}', {raw:true, detailedOutput:true});
r.code = r.code.replace(/\s+/g, '');
//console.log(inspect(r));
assertContainsCode(r, 'a={x:foo(bar),y:foo(baz)}');

// shorthand call style over several lines inside a comment
//global.movedebug = true
r = move.compile('a = {x: foo bar,\n baz,\ny: foo baz\n}', {raw:true, detailedOutput:true});
r.code = r.code.replace(/\s+/g, '');
//console.log(inspect(r));
assertContainsCode(r, 'a={x:foo(bar,baz),y:foo(baz)}');
