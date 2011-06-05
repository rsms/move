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
