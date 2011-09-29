/***********************************************************************

  A JavaScript tokenizer / parser / beautifier / compressor.

  This version is suitable for Node.js.  With minimal changes (the
  exports stuff) it should work on any JS platform.

  This file contains the tokenizer/parser.  It is a port to JavaScript
  of parse-js [1], a JavaScript parser library written in Common Lisp
  by Marijn Haverbeke.  Thank you Marijn!

  [1] http://marijn.haverbeke.nl/parse-js/

  Exported functions:

  - tokenizer(code) -- returns a function.  Call the returned
  function to fetch the next token.

  - parse(code) -- returns an AST of the given JavaScript code.

  -------------------------------- (C) ---------------------------------

         Author: Mihai Bazon
       <mihai.bazon@gmail.com>
       http://mihai.bazon.net/blog

  Distributed under the BSD license:

  Copyright 2010 (c) Mihai Bazon <mihai.bazon@gmail.com>
  Based on parse-js (http://marijn.haverbeke.nl/parse-js/).

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions
  are met:

  * Redistributions of source code must retain the above
    copyright notice, this list of conditions and the following
    disclaimer.

  * Redistributions in binary form must reproduce the above
    copyright notice, this list of conditions and the following
    disclaimer in the documentation and/or other materials
    provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDER “AS IS” AND ANY
  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
  PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE
  LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
  OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
  PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
  THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
  TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
  THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
  SUCH DAMAGE.

 ***********************************************************************/

/* -----[ Tokenizer (constants) ]----- */

var KEYWORDS = array_to_hash([
  "break",
  "case",
  "catch",
  "const",
  "continue",
  "default",
  "delete",
  "do",
  "else",
  "finally",
  "for",
  "function",
  "if",
  "in",
  "instanceof",
  "new",
  "return",
  "switch",
  "throw",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "import",
  "export",
  "xor"
]);
exports.KEYWORDS = KEYWORDS;

var RESERVED_WORDS = array_to_hash([
  "abstract",
  "boolean",
  "byte",
  "char",
  "class",
  "debugger",
  "double",
  "enum",
  "extends",
  "final",
  "float",
  "goto",
  "implements",
  "int",
  "interface",
  "long",
  "native",
  "package",
  "private",
  "protected",
  "public",
  "short",
  "static",
  "super",
  "synchronized",
  "throws",
  "transient",
  "volatile"
]);
exports.RESERVED_WORDS = RESERVED_WORDS;

var KEYWORDS_BEFORE_EXPRESSION = array_to_hash([
  "return",
  "new",
  "delete",
  "throw",
  "else",
  "case"
]);

var KEYWORDS_ATOM = array_to_hash([
  "false",
  "null",
  "true",
  "undefined"
]);

var OPERATOR_CHARS = array_to_hash(characters("+-*&%=<>!?|~"));

var RE_HEX_NUMBER = /^0x[0-9a-f]+$/i;
var RE_OCT_NUMBER = /^0[0-7]+$/;
var RE_DEC_NUMBER = /^\d*\.?\d*(?:e[+-]?\d*(?:\d\.?|\.?\d)\d*)?$/i;

var OPERATORS = array_to_hash([
  "in",
  "instanceof",
  "typeof",
  "new",
  "void",
  "delete",
  "++",
  "--",
  "+",
  "-",
  "!",
  "~",
  "&",
  "|",
  "*",
  "/",
  "%",
  ">>",
  "<<",
  ">>>",
  "<",
  ">",
  "<=",
  ">=",
  "==",
  "===",
  "!=",
  "!==",
  "?",
  "=",
  "+=",
  "-=",
  "/=",
  "*=",
  "%=",
  ">>=",
  "<<=",
  ">>>=",
  "%=",
  "|=",
  "&=",
  "&&",
  "||",

  // XOR (since Move use "^" for "Lambda")
  "xor",
  //"xor=",
]);

var WHITESPACE_CHARS = array_to_hash(characters(" \n\r\t"));

var PUNC_BEFORE_EXPRESSION = array_to_hash(characters("[{}(,.;:"));

var PUNC_CHARS = array_to_hash(characters("[]{}(),;:"));

var REGEXP_MODIFIERS = array_to_hash(characters("gmsiy"));

/* -----[ Tokenizer ]----- */

function is_alphanumeric_char(ch) {
  ch = ch.charCodeAt(0);
  return (ch >= 48 && ch <= 57) ||
    (ch >= 65 && ch <= 90) ||
    (ch >= 97 && ch <= 122);
};

function is_identifier_char(ch) {
  return is_alphanumeric_char(ch) || ch == "$" || ch == "_";
};

function is_digit(ch) {
  ch = ch.charCodeAt(0);
  return ch >= 48 && ch <= 57;
};

function parse_js_number(num) {
  if (RE_HEX_NUMBER.test(num)) {
    return parseInt(num.substr(2), 16);
  } else if (RE_OCT_NUMBER.test(num)) {
    return parseInt(num.substr(1), 8);
  } else if (RE_DEC_NUMBER.test(num)) {
    return parseFloat(num);
  }
};

function JS_Parse_Error(message, line, col, pos) {
  this.name = 'JS_Parse_Error';
  this.message = message;
  this.line = line;
  this.col = col;
  this.pos = pos;
  try {
    ({})();
  } catch(ex) {
    this.stack = this.message;
    if (ex && ex.stack)
      this.stack += '\n' + ex.stack.split(/[\r\n]/).slice(3).join('\n');
  };
};

JS_Parse_Error.prototype.toString = function() {
  return this.message + " (line: " + this.line + ", col: " + this.col + ", pos: " + this.pos + ")" + "\n\n" + this.stack;
};

function js_error(message, line, col, pos) {
  throw new JS_Parse_Error(message, line, col, pos);
};

function is_token(token, type, val) {
  return token.type == type && (val == null || token.value == val);
};

var EX_EOF = {};

function tokenizer($TEXT, options) {
  if (typeof options !== 'object') options = {};

  var S = {
    text    : $TEXT.replace(/\r\n?|[\n\u2028\u2029]/g, "\n").replace(/^\uFEFF/, ''),
    pos     : 0,
    tokpos    : 0,
    line    : 0,
    tokline   : 0,
    col     : 0,
    tokcol    : 0,
    newline_before  : false,
    regex_allowed   : false,
    comments_before : [],
    queued_tokens: []
  };

  function peek() { return S.text.charAt(S.pos); };

  function next(signal_eof) {
    var ch = S.text.charAt(S.pos++);
    if (signal_eof && !ch)
      throw EX_EOF;
    if (ch == "\n") {
      S.newline_before = true;
      ++S.line;
      S.col = 0;
    } else {
      ++S.col;
    }
    return ch;
  };

  function eof() {
    return !S.peek();
  };

  function find(what, signal_eof) {
    var pos = S.text.indexOf(what, S.pos);
    if (signal_eof && pos == -1) throw EX_EOF;
    return pos;
  };

  function start_token() {
    S.tokline = S.line;
    S.tokcol = S.col;
    S.tokpos = S.pos;
  };

  function token(type, value, is_comment) {
    S.regex_allowed = (
        (type == "operator" && !HOP(UNARY_POSTFIX, value))
        || (type === "keyword" && HOP(KEYWORDS_BEFORE_EXPRESSION, value))
        || (type === "punc" && HOP(PUNC_BEFORE_EXPRESSION, value))
        /*|| (type === 'name')
            BUG:
            - Enables regexp as fist arg to shorthand call-style e.g. foo /.+/
            - But BREAKS division e.g. x / 5

            Related unit test: regression-parser-shorthand-regexp.js
        */
        );
    var ret = {
      type  : type,
      value : value,
      line  : S.tokline,
      col   : S.tokcol,
      pos   : S.tokpos,
      nlb   : S.newline_before
    };
    if (!is_comment) {
      ret.comments_before = S.comments_before;
      S.comments_before = [];
    }
    S.newline_before = false;
    S.prev_token = ret;
    return ret;
  };

  function skip_whitespace() {
    while (HOP(WHITESPACE_CHARS, peek()))
      next();
  };

  function read_while(pred) {
    var ret = "", ch = peek(), i = 0;
    while (ch && pred(ch, i++)) {
      ret += next();
      ch = peek();
    }
    return ret;
  };

  function parse_error(err) {
    js_error(err, S.tokline, S.tokcol, S.tokpos);
  };

  function read_num(prefix) {
    var has_e = false, after_e = false, has_x = false, has_dot = prefix == ".";
    var num = read_while(function(ch, i){
      if (ch == "x" || ch == "X") {
        if (has_x) return false;
        return has_x = true;
      }
      if (!has_x && (ch == "E" || ch == "e")) {
        if (has_e) return false;
        return has_e = after_e = true;
      }
      if (ch == "-") {
        if (after_e || (i == 0 && !prefix)) return true;
        return false;
      }
      if (ch == "+") return after_e;
      after_e = false;
      if (ch == ".") {
        if (!has_dot)
          return has_dot = true;
        return false;
      }
      return is_alphanumeric_char(ch);
    });
    if (prefix)
      num = prefix + num;
    var valid = parse_js_number(num);
    if (!isNaN(valid)) {
      return token("num", valid);
    } else {
      parse_error("Invalid syntax: " + num);
    }
  };

  function read_escaped_char() {
    var ch = next(true);
    switch (ch) {
      case "n" : return "\n";
      case "r" : return "\r";
      case "t" : return "\t";
      case "b" : return "\b";
      case "v" : return "\v";
      case "f" : return "\f";
      case "0" : return "\0";
      case "x" : return String.fromCharCode(hex_bytes(2));
      case "u" : return String.fromCharCode(hex_bytes(4));
      default  : return ch;
    }
  };

  function hex_bytes(n) {
    var num = 0;
    for (; n > 0; --n) {
      var digit = parseInt(next(true), 16);
      if (isNaN(digit))
        parse_error("Invalid hex-character pattern in string");
      num = (num << 4) | digit;
    }
    return num;
  };

  function read_string() {
    return with_eof_error("Unterminated string constant", function(){
      var quote = next(), ret = "";
      for (;;) {
        var ch = next(true);
        if (ch == "\\") ch = read_escaped_char();
        else if (ch == quote) break;
        ret += ch;
      }
      return token("string", ret);
    });
  };

  function read_line_comment() {
    next();
    var i = find("\n"), ret;
    if (i == -1) {
      ret = S.text.substr(S.pos);
      S.pos = S.text.length;
    } else {
      ret = S.text.substring(S.pos, i);
      S.pos = i;
    }
    return token("comment1", ret, true);
  };

  function read_multiline_comment() {
    next();
    return with_eof_error("Unterminated multiline comment", function(){
      var i = find("*/", true),
        text = S.text.substring(S.pos, i),
        tok = token("comment2", text, true);
      S.pos = i + 2;
      S.line += text.split("\n").length - 1;
      S.newline_before = text.indexOf("\n") >= 0;
      return tok;
    });
  };

  function read_regexp() {
    return with_eof_error("Unterminated regular expression", function(){
      var prev_backslash = false, regexp = "", ch, in_class = false;
      while ((ch = next(true))) if (prev_backslash) {
        regexp += "\\" + ch;
        prev_backslash = false;
      } else if (ch == "[") {
        in_class = true;
        regexp += ch;
      } else if (ch == "]" && in_class) {
        in_class = false;
        regexp += ch;
      } else if (ch == "/" && !in_class) {
        break;
      } else if (ch == "\\") {
        prev_backslash = true;
      } else {
        regexp += ch;
      }
      var mods = read_while(function(ch){
        return HOP(REGEXP_MODIFIERS, ch);
      });
      return token("regexp", [ regexp, mods ]);
    });
  };

  function read_operator(prefix) {
    function grow(op) {
      if (!peek()) return op;
      var bigger = op + peek();
      if (HOP(OPERATORS, bigger)) {
        next();
        return grow(bigger);
      } else {
        return op;
      }
    };
    return token("operator", grow(prefix || next()));
  };

  function handle_slash() {
    next();
    var regex_allowed = S.regex_allowed;
    switch (peek()) {
      case "/":
      S.comments_before.push(read_line_comment());
      S.regex_allowed = regex_allowed;
      return next_token();
      case "*":
      S.comments_before.push(read_multiline_comment());
      S.regex_allowed = regex_allowed;
      return next_token();
    }
    return S.regex_allowed ? read_regexp() : read_operator("/");
  };

  function handle_dot() {
    next();
    return is_digit(peek())
      ? read_num(".")
      : token("punc", ".");
  };

  function read_word() {
    var word = read_while(is_identifier_char);
    return !HOP(KEYWORDS, word)
      ? token("name", word)
      : HOP(OPERATORS, word)
      ? token("operator", word)
      : HOP(KEYWORDS_ATOM, word)
      ? token("atom", word)
      : token("keyword", word);
  };

  function with_eof_error(eof_error, cont) {
    try {
      return cont();
    } catch(ex) {
      if (ex === EX_EOF) parse_error(eof_error);
      else throw ex;
    }
  };

  function next_token(force_regexp) {
    if (S.queued_tokens.length)
      return S.queued_tokens.shift();
    if (force_regexp)
      return read_regexp();
    skip_whitespace();
    start_token();
    var ch = peek();
    if (!ch) return token("eof");
    if (is_digit(ch)) return read_num();
    if (ch === '"' || ch === "'") return read_string();
    if (HOP(PUNC_CHARS, ch)) return token("punc", next());
    if (ch === ".") return handle_dot();
    if (ch === "/") return handle_slash();
    if (ch === "#") {
      var regex_allowed = S.regex_allowed;
      S.comments_before.push(read_line_comment());
      S.regex_allowed = regex_allowed;
      return next_token();
    }
    // filter "^" into "function"
    if (ch === "^") {
      next(); // pop "^"
      ch = peek();
      if (ch === '{') {
        // short form w/o arguments, i.e. "^{..." -> "function () {..."
        S.queued_tokens.push(token('punc', '('));
        S.queued_tokens.push(token('punc', ')'));
      }
      return token("keyword", 'function');
    }
    if (HOP(OPERATOR_CHARS, ch)) return read_operator();
    if (ch === '@') {
      next(); // pop "@"
      var word = read_word();
      var thistok = token('name', 'this');
      thistok.nlb = word.nlb;
      word.nlb = false;
      //if (peek() !== '[') // TODO: fix "@['key']"
        S.queued_tokens.push(token('punc', '.'));
      S.queued_tokens.push(word);
      return thistok;
    }
    if (is_identifier_char(ch)) return read_word();
    parse_error("Unexpected character '" + ch + "'");
  };

  next_token.context = function(nc) {
    if (nc) S = nc;
    return S;
  };

  return next_token;

};

/* -----[ Parser (constants) ]----- */

var UNARY_PREFIX = array_to_hash([
  "typeof",
  "void",
  "delete",
  "--",
  "++",
  "!",
  "~",
  "-",
  "+"
]);

var UNARY_POSTFIX = array_to_hash([ "--", "++" ]);

var ASSIGNMENT = (function(a, ret, i){
  while (i < a.length) {
    ret[a[i]] = a[i].substr(0, a[i].length - 1);
    i++;
  }
  return ret;
})(
  ["+=", "-=", "/=", "*=", "%=", ">>=", "<<=", ">>>=", "|=", "xor=", "&="],
  { "=": true },
  0
);

var PRECEDENCE = (function(a, ret){
  for (var i = 0, n = 1; i < a.length; ++i, ++n) {
    var b = a[i];
    for (var j = 0; j < b.length; ++j) {
      ret[b[j]] = n;
    }
  }
  return ret;
})(
  [
    ["||"],
    ["&&"],
    ["|"],
    ["xor"],
    ["&"],
    ["==", "===", "!=", "!=="],
    ["<", ">", "<=", ">=", "in", "instanceof"],
    [">>", "<<", ">>>"],
    ["+", "-"],
    ["*", "/", "%"]
  ],
  {}
);

var STATEMENTS_WITH_LABELS = array_to_hash([ "for", "do", "while", "switch" ]);

var ATOMIC_START_TOKEN = array_to_hash([ "atom", "num", "string", "regexp", "name" ]);

/* -----[ Parser ]----- */

function NodeWithToken(str, start, end) {
  this.name = str;
  this.start = start;
  this.end = end;
};

NodeWithToken.prototype.toString = function() { return this.name; };

/*var TokenInputBuffer = function (tokenizerOrText, tokenizerOptions) {
  if (typeof tokenizerOrText === "string")
    tokenizerOrText = tokenizer(tokenizerOrText, tokenizerOptions);
  var tib = function TokenInputBuffer_(forceRegExp) { return tib.pop(forceRegExp); };
  tokenStream = tokenizerOrText;
  buffer = []; // beginning = next to pop ("pop left")
  tib.pop = function (forceRegExp) {
    if (buffer.length === 0) {
      return tokenStream(forceRegExp);
    } else {
      return buffer.shift();
    }
  };
  tib.push = function (token) {
    buffer.push(token);
  };
  tib.peek = function (futureOffset) {
    if (futureOffset === undefined) futureOffset = 1;
    var i, n = futureOffset;
    if (buffer.length < futureOffset) {
      i = futureOffset - buffer.length;
      while (i--) {
        buffer.push(tokenStream());
      }
    }
    return buffer[futureOffset-1];
  }
  return tib;
};*/

function parse($TEXT, strict_mode, embed_tokens) {
  var options = {};
  if (typeof strict_mode === 'object') {
    options = strict_mode;
    strict_mode = options.strictMode;
    embed_tokens = options.embedTokens;
  }

  var S = {
    //input   : TokenInputBuffer($TEXT, options),
    input   : typeof $TEXT == "string" ? tokenizer($TEXT, options) : $TEXT,
    token   : null,
    prev  : null,
    peeked  : null,
    in_function : 0,
    in_loop   : 0,
    labels  : []
  };

  S.token = next();

  function is(type, value) {
    return is_token(S.token, type, value);
  };

  function peek() { return S.peeked || (S.peeked = S.input()); };
  function peek2() {
    if (S.peeked2) return S.peeked2;
    peek();
    return (S.peeked2 = S.input());
  };

  function next() {
    S.prev = S.token;
    if (S.peeked) {
      S.token = S.peeked;
      if (S.peeked2) {
        S.peeked = S.peeked2;
        S.peeked2 = null;
      } else {
        S.peeked = null;
      }
    } else {
      S.token = S.input();
    }
    return S.token;
  };

  function prev() {
    return S.prev;
  };

  function croak(msg, line, col, pos) {
    var ctx = S.input.context();
    js_error(msg,
       line != null ? line : ctx.tokline,
       col != null ? col : ctx.tokcol,
       pos != null ? pos : ctx.tokpos);
  };

  function token_error(token, msg) {
    croak(msg, token.line, token.col);
  };

  function unexpected(token) {
    if (token == null)
      token = S.token;
    token_error(token, "Unexpected token: " + token.type + " " + JSON.stringify(token.value));
  };

  function expect_token(type, val) {
    if (is(type, val)) {
      return next();
    }
    token_error(S.token, "Unexpected token: " + S.token.type + ", expected " + type);
  };

  function expect_token2(type1, val1, type2, val2) {
    if (is(type1, val1) || is(type2, val2)) {
      return next();
    }
    token_error(S.token, "Unexpected token: " + S.token.type +
                ", expected " + type1 + " or " + type2);
  };

  function expect(punc) { return expect_token("punc", punc); };
  function expect2(punc1, punc2) {
    return expect_token2("punc", punc1, "punc", punc2);
  };

  function can_insert_semicolon() {
    return !strict_mode && (
      S.token.nlb || is("eof") || is("punc", "}")
    );
  };

  function semicolon() {
    if (is("punc", ";")) next();
    else if (!can_insert_semicolon()) unexpected();
  };

  function as() {
    return slice(arguments);
  };

  function parenthesised() {
    expect("(");
    var ex = expression();
    expect(")");
    return ex;
  };

  function add_tokens(str, start, end) {
    return str instanceof NodeWithToken ? str : new NodeWithToken(str, start, end);
  };

  var statement = embed_tokens ? function() {
    var start = S.token;
    var ast = $statement.apply(this, arguments);
    ast[0] = add_tokens(ast[0], start, prev());
    return ast;
  } : $statement;

  function $statement() {
    if (is("operator", "/")) {
      if (S.peeked2) {
        S.token = S.peeked2;
        S.peeked2 = null;
      } else {
        S.token = S.input(true); // force regexp
      }
      S.peeked = null;
    }
    //console.log('S.token ->', S.token)

    // "var" keyword is not allowed when automatic variable declaration is enabled
    if (options.automaticVarDeclarations && S.token.type === 'keyword' &&
        S.token.value === 'var') {
      unexpected();
    }

    switch (S.token.type) {
      case "num":
      case "string":
      case "regexp":
      case "operator":
      case "atom":
      return simple_statement();

      case "name":
      return is_token(peek(), "punc", ":")
        ? labeled_statement(prog1(S.token.value, next, next))
        : simple_statement();

      case "punc":
      switch (S.token.value) {
        case "{":
        return as("block", block_());
        case "[":
        case "(":
        return simple_statement();
        case ";":
        next();
        return as("block");
        default:
        unexpected();
      }

      case "keyword":
      switch (prog1(S.token.value, next)) {
        case "break":
        return break_cont("break");

        case "continue":
        return break_cont("continue");

        case "debugger":
        semicolon();
        return as("debugger");

        case "do":
        return (function(body){
          expect_token("keyword", "while");
          return as("do", prog1(parenthesised, semicolon), body);
        })(in_loop(statement));

        case "for":
        return for_();

        case "function":
        return function_(true);

        case "if":
        return if_();

        case "return":
        if (S.in_function == 0)
          croak("'return' outside of function");
        return as("return",
             is("punc", ";")
             ? (next(), null) : can_insert_semicolon()
             ? null : prog1(expression, semicolon));

        case "switch":
        return as("switch", parenthesised(), switch_block_());

        case "throw":
        return as("throw", prog1(expression, semicolon));

        case "try":
        return try_();

        case "var":
          return prog1(var_, semicolon);

        case "const":
        return prog1(const_, semicolon);

        case "while":
        return as("while", parenthesised(), in_loop(statement));

        case "with":
        //return as("with", parenthesised(), statement());
        croak("'with' statement not allowed");

        case "import":
        return prog1(import_, semicolon);

        case "export":
        return prog1(export_, semicolon);

        default:
        unexpected();
      }
    }
  };

  function labeled_statement(label) {
    S.labels.push(label);
    var start = S.token, stat = statement();
    if (strict_mode && !HOP(STATEMENTS_WITH_LABELS, stat[0]))
      unexpected(start);
    S.labels.pop();
    return as("label", label, stat);
  };

  function simple_statement() {
    return as("stat", prog1(expression, semicolon));
  };

  function break_cont(type) {
    var name = is("name") ? S.token.value : null;
    if (name != null) {
      next();
      if (!member(name, S.labels))
        croak("Label " + name + " without matching loop or statement");
    }
    else if (S.in_loop == 0)
      croak(type + " not inside a loop or switch");
    semicolon();
    return as(type, name);
  };

  function for_() {
    var expectParenthesis = false;
    if (expectParenthesis = is('punc', '(')) { next(); }

    var has_var = !options.automaticVarDeclarations && is("keyword", "var");
    if (has_var)
      next();
    if (is("name") && is_token(peek(), "operator", "in")) {
      // for (i in foo)
      var name = S.token.value;
      next(); next();
      var obj = expression(false, /*allow_calls=*/expectParenthesis);
      if (expectParenthesis) { expect(")"); }
      return as("for-in", has_var, name, obj, in_loop(statement));
    } else {
      // classic for
      var init = is("punc", ";") ? null : has_var ? var_() : expression();
      expect(";");
      var test = is("punc", ";") ? null : expression();
      expect(";");
      var step;
      if (expectParenthesis) {
        step = is("punc", ")") ? null : expression();
        expect(")");
      } else {
        step = is("punc", "{") ? null
             : expression(false, /*allow_calls=*/false, /*no_objects=*/true);
      }
      return as("for", init, test, step, in_loop(statement));
    }
  };

  var function_ = embed_tokens ? function() {
    var start = prev();
    var ast = $function_.apply(this, arguments);
    ast[0] = add_tokens(ast[0], start, prev());
    return ast;
  } : $function_;

  function $function_(in_statement) {
    var name = is("name") ? prog1(S.token.value, next) : null;
    if (in_statement && !name && !S.in_function) {
      unexpected();
    }
    expect("(");
    var args = object_args_();
    return as(in_statement ? "defun" : "function",
      name,
      // arguments
      args.names,
      // body
      (function(){
        ++S.in_function;
        var loop = S.in_loop;
        S.in_loop = 0;
        var a = block_();
        --S.in_function;
        S.in_loop = loop;
        return a;
      })(),
      // default argument values
      args.values
    );
  };

  /*function $function_(in_statement) {
    var name = is("name") ? prog1(S.token.value, next) : null;
    if (in_statement && !name)
      unexpected();
    expect("(");
    return as(in_statement ? "defun" : "function",
        name,
        // arguments
        (function(first, a){
          while (!is("punc", ")")) {
            if (first) first = false; else expect(",");
            if (!is("name")) unexpected();
            a.push(S.token.value);
            next();
          }
          next();
          return a;
        })(true, []),
        // body
        (function(){
          ++S.in_function;
          var loop = S.in_loop;
          S.in_loop = 0;
          var a = block_();
          --S.in_function;
          S.in_loop = loop;
          return a;
        })());
  };*/

  function if_() {
    var cond = parenthesised(), body = statement(), belse;
    if (is("keyword", "else")) {
      next();
      belse = statement();
    }
    return as("if", cond, body, belse);
  };

  function block_() {
    expect("{");
    var a = [];
    while (!is("punc", "}")) {
      if (is("eof")) unexpected();
      a.push(statement());
    }
    next();
    return a;
  };

  var switch_block_ = curry(in_loop, function(){
    expect("{");
    var a = [], cur = null;
    while (!is("punc", "}")) {
      if (is("eof")) unexpected();
      if (is("keyword", "case")) {
        next();
        cur = [];
        a.push([ expression(), cur ]);
        expect(":");
      }
      else if (is("keyword", "default")) {
        next();
        expect(":");
        cur = [];
        a.push([ null, cur ]);
      }
      else {
        if (!cur) unexpected();
        cur.push(statement());
      }
    }
    next();
    return a;
  });

  function try_() {
    var body = block_(), bcatch, bfinally;
    if (is("keyword", "catch")) {
      next();
      expect("(");
      if (!is("name"))
        croak("Name expected");
      var name = S.token.value;
      next();
      expect(")");
      bcatch = [ name, block_() ];
    }
    if (is("keyword", "finally")) {
      next();
      bfinally = block_();
    }
    if (!bcatch && !bfinally)
      croak("Missing catch/finally blocks");
    return as("try", body, bcatch, bfinally);
  };

  function vardefs() {
    var a = [];
    for (;;) {
      if (!is("name"))
        unexpected();
      var name = S.token.value;
      next();
      if (is("operator", "=")) {
        next();
        a.push([ name, expression(false) ]);
      } else {
        a.push([ name ]);
      }
      if (!is("punc", ","))
        break;
      next();
    }
    return a;
  };

  function importdefs() {
    var a = [], relPathDepth = 0, name, symbolName, path, n;
    for (;;) {
      // Zero or more "."
      relPathDepth = 0;
      while (S.token.value === '.') {
        ++relPathDepth;
        next();
      }
      // A symbol name
      if (!is("name"))
        unexpected();

      name = [S.token.value];
      next();

      // "foo/bar/baz" -> ["foo", "bar", "baz"]
      while (S.token.value === '/') {
        next();
        if (!is("name"))
          unexpected();
        name.push(S.token.value);
        next();
      }
      
      symbolName = name[name.length-1];
      path = name.join('/');
      
      // Optional explicit value
      if (relPathDepth) {
        if (relPathDepth === 1) {
          path = './'+path;
        } else {
          n = relPathDepth-1;
          while (n--) path = '../' + path;
        }
        a.push([ symbolName, ["string", path] ]);
      } else if (is("operator", "=")) {
        next();
        a.push([ symbolName, expression(false) ]);
      } else {
        a.push([ symbolName, ["string", path] ]);
      }
      if (!is("punc", ","))
        break;
      next();
    }
    return a;
  };

  function var_() {
    return as("var", vardefs());
  };

  function const_() {
    return as("const", vardefs());
  };

  function import_() {
    return as("import", importdefs());
  };

  function export_() {
    return as("export", vardefs());
  };

  function new_() {
    var newexp = expr_atom(false), args;
    if (is("punc", "(")) {
      next();
      args = expr_list(")");
    } else {
      args = [];
    }
    return subscripts(as("new", newexp, args), true);
  };

  function expr_atom(allow_calls, no_objects) {
    if (is("operator", "new")) {
      next();
      return new_();
    }
    if (is("operator") && HOP(UNARY_PREFIX, S.token.value)) {
      return make_unary("unary-prefix",
            prog1(S.token.value, next),
            expr_atom(allow_calls, no_objects));
    }
    if (is("punc") /*&& (!no_objects || S.token.value !== '{')*/) {
      switch (S.token.value) {
        case "(":
        next();
        return subscripts(prog1(expression(false, allow_calls, no_objects), curry(expect, ")")), allow_calls);
        case "[":
        next();
        return subscripts(array_(), allow_calls, no_objects);
        case "{":
        next();
        return subscripts(object_(), allow_calls, no_objects);
      }
      unexpected();
    }
    if (is("keyword", "function")) {
      next();
      return subscripts(function_(false), allow_calls);
    }
    if (HOP(ATOMIC_START_TOKEN, S.token.type)) {
      var atom = S.token.type == "regexp"
        ? as("regexp", S.token.value[0], S.token.value[1])
        : as(S.token.type, S.token.value);
      return subscripts(prog1(atom, next), allow_calls, no_objects);
    }
    unexpected();
  };

  function expr_list(closing, allow_trailing_comma, allow_empty) {
    var first = true, a = [];
    while (!is("punc", closing)) {
      if (first) first = false; else expect(",");
      if (allow_trailing_comma && is("punc", closing)) break;
      if (is("punc", ",") && allow_empty) {
        a.push([ "atom", "undefined" ]);
      } else {
        a.push(expression(false));
      }
    }
    next();
    return a;
  };

  function expr_list_v(closing, allow_trailing_comma, allow_empty, maxcount) {
    var first = true, a = [];
    if (!maxcount) maxcount = 0xffffffffffffffff
    try {
      while (!is("punc", closing) && --maxcount) {
        if (first) first = false; else expect(",");
        if (allow_trailing_comma && is("punc", closing)) break;
        if (is("punc", ",") && allow_empty) {
          a.push([ "atom", "undefined" ]);
        } else {
          a.push(expression(false));
        }
      }
      next();
    } catch(e) {
      // "Unexpected token" error terminates the list
      if (String(e.message).indexOf('Unexpected token') !== 0)
        throw e;
    }
    return a;
  };

  function array_() {
    return as("array", expr_list("]", !strict_mode, true));
  };

  function object_() {
    var first = true, a = [];
    while (!is("punc", "}")) {
      if (first) first = false; else expect(",");
      if (!strict_mode && is("punc", "}"))
        // allow trailing comma
        break;
      var type = S.token.type;
      var name = as_property_name();
      if (type == "name" && (name == "get" || name == "set") && !is("punc", ":")) {
        a.push([ as_name(), function_(false), name ]);
      } else {
        expect(":");
        a.push([ name, expression(false) ]);
      }
    }
    next();
    return as("object", a);
  };

  function object_args_() {
    var first = true, type, name, names = [], values = {};
    while (!is("punc", ")")) {
      if (first) first = false; else expect(",");
      if (!strict_mode && is("punc", ")")) {
        // allow trailing comma
        break;
      }
      type = S.token.type;
      name = as_property_name();
      names.push(name);
      // Allows for specifying default value using either : or =
      if (is("punc", ":") /*|| is("operator", "=")*/) {
        next();
        values[name] = expression(false);
      } else {
        values[name] = undefined;
      }
    }
    next();
    return {names:names, values:values};
  };

  function as_property_name() {
    switch (S.token.type) {
      case "num":
      case "string":
      return prog1(S.token.value, next);
    }
    return as_name();
  };

  function as_name() {
    switch (S.token.type) {
      case "name":
      case "operator":
      case "keyword":
      case "atom":
      return prog1(S.token.value, next);
      default:
      unexpected();
    }
  };

  function _slice(expr, leftExpr, rightExpr, allow_calls) {
    if (is("operator", "=")) {
      // write slice (e.g. "y[1:2] = x")
      next(); // skip the "="
      var value = statement(); // read the right-hand-side (source) statement

      // Convert slice-write notation into calls to:
      // _move_setSlice(startIndex, endIndex=@length, value)
      return subscripts(['call', ['dot', expr, '_move_setSlice'], [
        leftExpr || ['num', '0'],
        rightExpr || ['name', 'undefined'],
        value[1] || ['name', 'undefined']
      ]], allow_calls);
    } else {
      // read slice (e.g. "x = y[1:2]")

      // This block "converts" slice notation into calls to a "slice" method
      var args = [leftExpr || ['num', '0']];
      if (rightExpr) args.push(rightExpr);
      return subscripts(['call', ['dot', expr, 'slice'], args], allow_calls);

      // This code can be used instead of the above lines to output a "slice"
      // AST node/branch:
      /*if (rightExpr) {
        return subscripts(as("slice", expr, leftExpr, rightExpr), allow_calls);
      } else if (leftExpr) {
        return subscripts(as("slice", expr, leftExpr), allow_calls);
      } else {
        return subscripts(as("slice", expr), allow_calls);
      }*/
    }
  }

  function subscripts(expr, allow_calls, no_objects) {
    if (is("punc", ".")) {
      next();
      return subscripts(as("dot", expr, as_name()), allow_calls, no_objects);
    }
    if (is("punc", "[")) {

      if (S.token.nlb /*&& expr[0] === 'sub'*/) {
        // Fix for issue #9
        // The previous line ended with a subscript ...] and the current line
        // starts with a subscript [... -- don't walk further but unroll current
        // branch (the previous line's ...]), causing the current line to form
        // a new branch, separating the different subscript accesses.
        return expr;
      }

      next();
      var leftExpr = null, rightExpr = null;
      if (is('punc', ':')) {
        // we are dealing with a [:y] slice
        next();
      } else {
        // read left expression
        leftExpr = prog1(expression(false, allow_calls, no_objects), curry(expect2, "]", ":"));
      }
      if (S.prev.value === ':') {
        // We are dealing with a [x:y] slice
        if (is('punc', ']')) {
          // [x:]
          next(); // skip past the terminating "]"
        } else {
          // [x:y]
          rightExpr = prog1(expression(false, allow_calls, no_objects), curry(expect, "]"));
        }
        return _slice(expr, leftExpr, rightExpr, allow_calls);
      } else {
        // we are dealing with a subscript
        return subscripts(as("sub", expr, leftExpr), allow_calls, no_objects);
      }
    }
    if (allow_calls && is("punc", "(")) {
      if (S.token.nlb) {
        // Fixes this case:
        //    foo bar
        //    (x) && x()
        // Which otherwise parse as "foo(bar(x) && x())"
        return expr;
      }
      /*
       [ 'call',
         [ 'name', 'foo' ],
         [ [ 'string', 'value1' ], [ 'string', 'value2' ] ] ]
      */
      next();
      return subscripts(as("call", expr, expr_list(")")), allow_calls, no_objects);
    }
    if (allow_calls && !no_objects && options.keywordArguments && is("punc", "{")) {
      if (S.token.nlb) {
        // Fixes this case:
        //    foo bar
        //    {x:1} && x()
        // Which otherwise parse as "foo(bar(x) && x())"
        return expr;
      }
      next();
      var kwargs;

      // "foo {&kwargs}" call style for passing keyword args
      if (is("operator", "&")) {
        next();
        kwargs = expression(false, allow_calls, no_objects);
        expect("}");
        if (!options.raw) {
          // wrap in
          kwargs = ['call', ['name', '_MoveKWArgsT'], [kwargs]];
        }
      } else {
        kwargs = object_();
        kwargs[1].push(['__kw', ['name', '__Move_KWArgs__']]);
      }

      var nameExpr = expr;
      //console.log('kwargs', require('util').inspect(kwargs, 0, 10))
      return subscripts(as("call", nameExpr, [kwargs]), allow_calls, no_objects);
    }
    /*if (allow_calls && is("operator", "!")) {
      next();
      var subexprs = expr_list_v(";");
      return subscripts(as("call", expr, subexprs), true);
    }*/
    /*if (allow_calls && is("punc", ":")) {
    //if (allow_calls && is("operator", "!")) {
      next();
      var subexprs = expr_list_v(";");
      return subscripts(as("call", expr, subexprs), true);
    }*/
    if (allow_calls && is("operator") && HOP(UNARY_POSTFIX, S.token.value)) {
      if (S.token.nlb) {
        // Fixes this case:
        //   foo = bar<LF>
        //   ++x
        // Which otherwise parse as "foo = bar++x" and causes a parse error
        return expr;
      }
      return prog1(curry(make_unary, "unary-postfix", S.token.value, expr),
           next);
    }
    // shorthand "foo arg" style function invocation
    if (allow_calls && !is("eof") && !is("punc") && !is("operator")
        && (S.token.type !== "keyword" || S.token.value === "function")
       ) {
      // Use this line to allow only single argument
      //var subexprs = [expression(false)];

      if (S.token.nlb) {
        // Fixes this case:
        //    foo bar
        //    {x:1} && x()
        // Which otherwise parse as "foo(bar(x) && x())"
        return expr;
      }

      // Use the following try-clause to allow multiple arguments. However, be
      // aware that by allowing arbitrary long arguments in short-hand form,
      // syntax become somewhat ambiguous. This expression:
      //    assert.equal(foo foo foo "Hello", "Hello")
      // translates to:
      //    assert.equal(foo(foo(foo("Hello"), "Hello")))
      // while most people would expect it to translate into:
      //    assert.equal(foo(foo(foo("Hello"))), "Hello")
      // which is the case when only consuming a single argument.
      //
      var subexprs = [], first = true, aborted, p1, p2;
      //try {
      while (!is("punc", ';')) {
        if (first) {
          first = false;
        } else if (is("punc", ",")) {

          p1 = peek();
          if (p1.type === 'name' &&
              (!(p2 = peek2()) || (p2.type === 'punc' && p2.value === ':'))) {
            // Special case:
            // { foo: 'arg1', 'arg2',
            //   <terminate foo args>
            //   bar: 2,
            // }
            aborted = true;
            break;
          }

          if (p1.type === 'punc' && p1.value === '}') {
            // Special case:
            // { foo: 1,
            //   bar: 2,
            // }
            // ^
            aborted = true;
            break;
          }

          next();
        } else {
          aborted = true;
          break;
        }
        subexprs.push(expression(false, allow_calls, no_objects));
      }
      if (!aborted && !is("punc", ';')) {
        next();
      }
      /*} catch(e) {
        // "Unexpected token" error terminates the list
        if (String(e.message).indexOf('Unexpected token') !== 0)
          throw e;
      }*/
      //console.log('END', S.token)
      if (S.token.nlb || is("punc", ';'))
        return as("call", expr, subexprs);

      return subscripts(as("call", expr, subexprs), true, no_objects);
    }
    return expr;
  };

  function make_unary(tag, op, expr) {
    if ((op == "++" || op == "--") && !is_assignable(expr))
      croak("Invalid use of " + op + " operator");
    return as(tag, op, expr);
  };

  function expr_op(left, min_prec, allow_calls, no_objects) {
    var op = is("operator") ? S.token.value : null;
    var prec = op != null ? PRECEDENCE[op] : null;
    if (allow_calls === undefined) allow_calls = true;
    if (prec != null && prec > min_prec) {
      next();
      var right = expr_op(expr_atom(allow_calls, no_objects), prec, allow_calls, no_objects);
      return expr_op(as("binary", op, left, right), min_prec, allow_calls, no_objects);
    }
    return left;
  };

  function expr_ops(allow_calls, no_objects) {
    if (allow_calls === undefined) allow_calls = true;
    return expr_op(expr_atom(allow_calls, no_objects), 0, allow_calls, no_objects);
  };

  function maybe_conditional(allow_calls, no_objects) {
    var expr = expr_ops(allow_calls, no_objects);
    if (is("operator", "?")) {
      next();
      var yes = expression(false, allow_calls, no_objects);
      expect(":");
      return as("conditional", expr, yes, expression(false, allow_calls, no_objects));
    }
    return expr;
  };

  function is_assignable(expr) {
    switch (expr[0]) {
      case "dot":
      case "sub":
      return true;
      case "name":
      return expr[1] != "this";
    }
  };

  function maybe_assign(allow_calls, no_objects) {
    var left = maybe_conditional(allow_calls, no_objects), val = S.token.value;
    if (is("operator") && HOP(ASSIGNMENT, val)) {
      if (is_assignable(left)) {
        next();
        return as("assign", ASSIGNMENT[val], left, maybe_assign());
      }
      croak("Invalid assignment");
    }
    return left;
  };

  function expression(commas, allow_calls, no_objects) {
    if (arguments.length == 0)
      commas = true;
    var expr = maybe_assign(allow_calls, no_objects);
    if (commas && is("punc", ",")) {
      next();
      return as("seq", expr, expression());
    }
    return expr;
  };

  function in_loop(cont) {
    try {
      ++S.in_loop;
      return cont();
    } finally {
      --S.in_loop;
    }
  };

  return as("toplevel", (function(a){
    while (!is("eof"))
      a.push(statement());
    return a;
  })([]));

};

/* -----[ Utilities ]----- */

function curry(f) {
  var args = slice(arguments, 1);
  return function() { return f.apply(this, args.concat(slice(arguments))); };
};

function prog1(ret) {
  if (ret instanceof Function)
    ret = ret();
  for (var i = 1, n = arguments.length; --n > 0; ++i)
    arguments[i]();
  return ret;
};

function array_to_hash(a) {
  var ret = {};
  for (var i = 0; i < a.length; ++i)
    ret[a[i]] = true;
  return ret;
};

function slice(a, start) {
  return Array.prototype.slice.call(a, start == null ? 0 : start);
};

function characters(str) {
  return str.split("");
};

function member(name, array) {
  for (var i = array.length; --i >= 0;)
    if (array[i] === name)
      return true;
  return false;
};

function HOP(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
};

/* -----[ Exports ]----- */

exports.tokenizer = tokenizer;
exports.parse = parse;
exports.slice = slice;
exports.curry = curry;
exports.member = member;
exports.array_to_hash = array_to_hash;
exports.PRECEDENCE = PRECEDENCE;
exports.KEYWORDS_ATOM = KEYWORDS_ATOM;
exports.RESERVED_WORDS = RESERVED_WORDS;
exports.KEYWORDS = KEYWORDS;
exports.ATOMIC_START_TOKEN = ATOMIC_START_TOKEN;
exports.OPERATORS = OPERATORS;
exports.is_alphanumeric_char = is_alphanumeric_char;
exports.is_identifier_char = is_identifier_char;
