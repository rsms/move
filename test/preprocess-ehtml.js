var assert = require('assert');
var move = require('../lib');

/*
Test the EHTML (embedded HTML) preprocessor
*/

var jscode, source =
'x = 5\n' +
'fu = "Fuuu"\n'+
'description = <p>Description</p>\n'+
'photos = <div id="photos">{description}</div>\n' +
'repeat x, ^(i) {\n' +
'  photos.appendChild(<img src="image{i}.jpg"/>)\n' +
'}\n';

jscode = move.compile(source, {preprocess:['ehtml']});
//console.log(jscode);

assert.notEqual(jscode.indexOf("EHTML('<div id=\"photos\">'"), -1);
assert.notEqual(jscode.indexOf("EHTML('<img src=\"image' + i + '.jpg\"/>')"), -1);


// This should fail since "foo <img" is ambiguous, so we don't allow this
source = 'foo <img src="abc.jpg"/>\n';
assert['throws'](function() {
  move.compile(source, {preprocess:['ehtml']});
});


// This should success since "foo(<img...)" is not ambiguous
source = 'foo(<img src="abc.jpg"/>)\n';
assert.doesNotThrow(function() {
  move.compile(source, {preprocess:['ehtml']});
});

