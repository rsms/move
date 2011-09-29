var assert = require('assert'),
    util = require('util'),
    move = require('../lib'), r;
var inspect = function (obj) { return util.inspect(obj, false, 40); }
var assertContainsCode = function (r, code) {
  assert.ok(r.code.indexOf(code) !== -1, JSON.stringify(code)+' expected but not found');
};

//global.movedebug = true
r = move.compile('Organism = class Thing, {foo:3}', {raw:true, detailedOutput:true});
//console.log(inspect(r.ast), '\n'+r.code);
r.code = r.code.replace(/\s+/g, '');
//console.log(r.code);

// class -> __class
assertContainsCode(r, 'Organism=__class(');

// check argument position integrity
assertContainsCode(r, '},Thing,{foo:3})');

// implicit constructor implementation
assertContainsCode(r,
  '__class(Organism=functionOrganism(){return__class.create(Organism,arguments);}');

// no keyword argument signal in the prototype
assertContainsCode(r, '{foo:3}');
