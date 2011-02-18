// Compiles, generates and dumps the output JavaScript code
var C = require("../lib").compileFileSync;
var out = C('./example4-subject.mv', {
  detailedOutput:true,
  //automaticVarDeclarations:false,
  //optimizationLevel:2,
  //mangleNames: true,
  //keywordArguments: false
});
//console.log(require('util').inspect(out.ast, false, 15));
console.log(out.code);

console.log('--------running-------')
//require('vm').runInThisContext(out.code);
require('./example4-subject');
