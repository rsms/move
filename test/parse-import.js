var assert = require('assert'),
    util = require('util'),
    move = require('../lib'), r;

var inspect = function (obj) { return util.inspect(obj, false, 40); }
var assertContainsCode = function (r, code) {
  assert.ok(r.code.indexOf(code) !== -1, inspect(code)+' expected but not found');
};
var dump = function (r) { console.log(inspect(r.ast), '\n'+r.code); }
if (process.argv.indexOf('--full-test-suite') !== -1) dump = function(){};

// Global
r = move.compile('import foo', {detailedOutput:true, raw:true});
//dump(r);
assertContainsCode(r, 'foo = require("foo")');

// Relative, same level
r = move.compile('import .foo', {detailedOutput:true, raw:true});
//dump(r);
assertContainsCode(r, 'foo = require("./foo")');

// Relative, upper level (1)
r = move.compile('import ..foo', {detailedOutput:true, raw:true});
//dump(r);
assertContainsCode(r, 'foo = require("../foo")');

// Relative, upper level (2)
r = move.compile('import ...foo', {detailedOutput:true, raw:true});
//dump(r);
assertContainsCode(r, 'foo = require("../../foo")');

// Relative, upper level (2), multi
r = move.compile('import ...foo, .bar', {detailedOutput:true, raw:true});
//dump(r);
assertContainsCode(r, 'foo = require("../../foo")');
assertContainsCode(r, 'bar = require("./bar")');

// Deep ("foo.bar")

// Deep, global
r = move.compile('import foo/bar', {detailedOutput:true, raw:true});
//dump(r);
assertContainsCode(r, 'bar = require("foo/bar")');

// Deep, relative, same level
r = move.compile('import .foo/bar', {detailedOutput:true, raw:true});
//dump(r);
assertContainsCode(r, 'bar = require("./foo/bar")');

// Deep, relative, upper level (1)
r = move.compile('import ..foo/bar', {detailedOutput:true, raw:true});
//dump(r);
assertContainsCode(r, 'bar = require("../foo/bar")');

// Deep, relative, upper level (2)
r = move.compile('import ...foo/bar', {detailedOutput:true, raw:true});
//dump(r);
assertContainsCode(r, 'bar = require("../../foo/bar")');

// Deep, relative, upper level (2), multi
r = move.compile('import ...foo/bar, baz, ..foo/bar2', {detailedOutput:true, raw:true});
//dump(r);
assertContainsCode(r, 'bar = require("../../foo/bar")');
assertContainsCode(r, 'baz = require("baz")');
assertContainsCode(r, 'bar2 = require("../foo/bar2")');

// Deep, relative, upper level (3) + extra
r = move.compile('import .....foo/bar/baz_mos', {detailedOutput:true, raw:true});
dump(r);
assertContainsCode(r, 'baz_mos = require("../../../../foo/bar/baz_mos")');
