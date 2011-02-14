# Move

> JavaScript moving forward (or: how JavaScript is meant to be written)

Move is a flavor (and a subset) of JavaScript improving in the following ways:

- Simpler: For instance; there's only one way to declare functions, no need of `var` declarations and no need for terminating statements with semicolons.

- Less boiler-plate code needed. Move introduces a few carefully selected features like the "import" and "export" keywords, and @-shorthand for `this` access.

- Move is a subset of JavaScript rather than a different language. This makes it possible to selectively use language features you like and e.g. using snippets of JavaScript code unmodified, directly in Move code.

## Installing and using Move

Currently Move itself (the compiler) is only running in CommonJS environments like Node.js, but code being generated is pure JavaScript without any implicit dependencies which should run wherever the code you write would normally run.

For now, it's easiest to install Move using the [Node Package Manager](http://npmjs.org/):

    npm install move

Then require the "move" module before requiring any move code. In this `example.js` we load "foo.move" which is a module written in Move:

    require("move");
    var foo = require("./foo")

There's also a simple API which can be accessed from the move module:

    var move = require("move");
    console.log(move.compile("bar = ^{ 5 * Math.PI }"));
    // Output:
    //   var bar;
    //   bar = function bar() {
    //     return 5 * Math.PI;
    //   };

## Difference to JavaScript

- **Functions** are declared using *one* construction: `^(arg1){...}` or `^{...}`
  
  - In JavaScript, there are two different ways to define a function: using the function expression and the function declaration statement, the latter having subtle restrictions. Move only has function expressions.
  
  - As functions, or lambdas, are the key awesomeness of JavaScript and is a very light-weight thing, the "function" keyword and boilerplate argument parens just need to be easier to write. Move uses the `^` keyword and does not enforce `()` for argument-less functions.

  - The last statement of a function is automatically returned.
  
  - Move adds a shorthand for calling functions without parens. E.g. `foo(bar)` is equivalent to `foo! bar` and `Some.foo(strip(bar))` can be written as `Some.foo! strip! bar`.

- **Variables** need not be explicitly declared. Move will declare a newfound variable in the scope which it first was used. This behavior is deterministic, in contrast to the ambiguous way implicitly declared variables work in JavaScript.

- **No commas** required to terminate expressions. Move will determine when a comma is needed so you don't have to (and the code gets more readable).

- **@-shorthand** for accessing properties of the `this` object. E.g. `this.foo = 5` can be written as `@foo = 5`.

- **Importing** CommonJS modules can be done using the `import` statement. E.g. rather than the tedious `var module1 = require("module1")` boilerplate, you can write `import module1`

- **Exporting** CommonJS modules is aided by the `export` statement. E.g. instead of writing `var foo = exports.foo = function () {...` you can write `export foo = ^{...` (or even `export foo` if `foo` is defined elsewhere).

Move is designed for humans which is the reason for why things like variable declarations and statement terminators has been removed -- they are simply not part of the essentials or essence of what a programmer should be thinking about. The computer is, or at least should be, better at deciding those things.

Features which interfere with how JavaScript work (e.g. implicit return statements, "import" & "export" sugar, etc) can be disabled at compile-time by passing certain options to the compile functions.

## A subset of JavaScript, not a different language

As Move is a subset of JavaScript rather than a different language -- Move's features can be selectively used when writing code. The following three examples are all valid Move code while the last one is also valid JavaScript code:

example1.move:

    export load = ^(path, callback) {
      fs.readFile! path, 'utf8', ^(err, content) {
        if (err) return callback! err
        callback! null, content.replace! /\t/, '  '
      }
    }

example2.move:

    var fs = require('fs')
    var load = exports.load = ^(path, callback) {
      return fs.readFile(path, "utf8", ^(err, content) {
        if (err) return callback(err)
        return callback(null, content.replace(/\t/, "  "))
      })
    }

example3.{move,js}:

    var fs = require('fs');
    var load = exports.load = function load(path, callback) {
      return fs.readFile(path, "utf8", function (err, content) {
        if (err) return callback(err);
        return callback(null, content.replace(/\t/, "  "));
      });
    };

## License (MIT)

Move incorporates some third-party, namely a derivation of [UglifyJS](https://github.com/mishoo/UglifyJS). These sources have a separate license embedded into their heads.

The rest of Move is licensed as follows:

Copyright (c) 2011 Rasmus Andersson <http://rsms.me/>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
