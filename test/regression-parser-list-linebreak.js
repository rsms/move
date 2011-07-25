var assert = require('assert'), move = require('../lib'),
    source = 'y[0]\n[1].x';

/*

Forced with explicit semicolon (reference results):

y[0];
[1].x

[ 'toplevel',
  [ [ 'stat', [ 'sub', [ 'name', 'y' ], [ 'num', 0 ] ] ],
    [ 'stat',
      [ 'dot', [ 'array', [ [ 'num', 1 ] ] ], 'x' ] ] ] ]

--------

Results when bug was found (incorrect):

y[0]
[1].x

[ 'toplevel',
  [ [ 'stat',
      [ 'dot',
        [ 'sub',
          [ 'sub', [ 'name', 'y' ], [ 'num', 0 ] ],
          [ 'num', 1 ] ],
        'x' ] ] ] ]

--------

Results after bug was fixed:

y[0]
[1].x

[ 'toplevel',
  [ [ 'stat', [ 'sub', [ 'name', 'y' ], [ 'num', 0 ] ] ],
    [ 'stat',
      [ 'dot', [ 'array', [ [ 'num', 1 ] ] ], 'x' ] ] ] ]


*/

var r = move.compile(source, {raw:true, detailedOutput:true});

// Testing for the bug
assert.ok(r.code.indexOf('y[0][1].x') === -1, '"y[0][1].x" is incorrect');
assert.ok(r.code.indexOf('y[0];') !== -1, '"y[0];" expected but not found');

// Make sure we didn't break deep subscript access branches
assert.ok(move.compile('y[0][1][2]\n[3].x',
  {raw:true}).indexOf( 'y[0][1][2];') !== -1);


global.movedebug = true

/*
This bug is about list definitions after linebreaks
Solution: if nlb and start of list then terminate previous declaration
*/
r = move.compile('foo bar, baz\n[1,2,3].x', {raw:true, detailedOutput:true});
assert.ok(r.code.indexOf('foo(bar, baz);') !== -1, '"foo(bar, baz);" expected but not found');
