var fs = require('fs');
var parser = require("./parse-js");
var processor = require("./process");
var astMutators = require("./ast-mutators");

// Compile Move `source` into JavaScript code
exports.compile = function compile(source, options) {
  var op = {
    strictMode: false,
    embedTokens: false,
    implicitReturns: true,
    automaticVarDeclarations: true,
    namedLambdas: true,
    mangleNames: false,
    optimizationLevel: 1,
    outputFormatting: {indent_level: 2},
    filename: '?',
  };

  // Coalesce options
  if (typeof options === 'object') for (var k in options) op[k] = options[k];

  // Parse Move and/or JavaScript source
  try {
    var ast = parser.parse(source, op.strictMode, op.embedTokens);
  } catch (e) {
    // Add pretty error message with source line for parse errors
    if (e.name === 'JS_Parse_Error') {
      e.name = 'SyntaxError';
      var epindent = ''; for (var x=0;x<e.col;++x) epindent += ' ';
      e.message = e.name+': '+e.message+'\n'+op.filename+':'+e.line+':'+e.col+'\n'+
                  source.split(/[\r\n]/)[e.line]+'\n'+
                  epindent+'\u2b06';
      if (e.stack)
        e.stack = e.message+'\n'+e.stack.split(/[\r\n]/).slice(1).join('\n');
    }
    throw e;
  }
  
  // Mutate AST
  if (op.implicitReturns)
    ast = astMutators.add_implicit_returns(ast);
  if (op.automaticVarDeclarations)
    ast = astMutators.first_time_var_delc(ast);
  if (op.namedLambdas)
    ast = astMutators.named_lambda_assignments(ast);
  if (op.mangleNames)
    ast = processor.ast_mangle(ast);
  
  // Apply optimizations
  if (op.optimizationLevel)
    ast = processor.ast_squeeze(ast);
  if (typeof op.optimizationLevel === 'number' && op.optimizationLevel > 1)
    ast = processor.ast_squeeze_more(ast);
  
  // Generate JavaScript code
  return processor.gen_code(ast, op.outputFormatting);
}

// Compile Move file at `filename` into JavaScript code
exports.compileFileSync = function compileFile(filename, options) {
  if (typeof options === 'object' && !options.filename) {
    options.filename = filename;
  } else {
    options = {filename: filename};
  }
  return exports.compile(fs.readFileSync(filename, 'utf8'), options);
}

// Provide CommonJS module service for loading move code
if (require.extensions) {
  require.extensions['.move'] = function compileMoveModule(module, filename) {
    content = exports.compileFileSync(filename);
    return module._compile(content, filename);
  }
}
