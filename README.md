# Move

Move is a simple but powerful programming language which can run on most computers (anywhere there's a >=ES3 JavaScript runtime). When compared to JavaScript, Move has the following key features:

- **Simpler.** E.g. there's only one way to declare functions, no need for `var` declarations, only a single type of equality operators and no need for terminating statements with semicolons.

- **Less boiler-plate** code needed. Move introduces a few carefully selected features like the "import" and "export" keywords, and @-shorthand for `this` access.

- Move runs in any >=ES3 JavaScript runtime and thus can be used as a universal programming language for everything from running in web browsers to powering complex offline systems.

A simple Move program which prints "Hello John" three times:

    hello = ^(name){ "Hello "+name }
    repeat {times: 3} ^{
      print hello {name: "John"}
    }

Move compiles directly to optimized JavaScript which can run on almost any computer (in a web browser or a runtime like Node.js).

## Installing and using Move

For now, it's easiest to install Move using the [Node Package Manager](http://npmjs.org/):

    npm install move

Then require the "move" module before requiring any move code. In this `example.js` we load "foo.move" which is a module written in Move:

    require("move");
    var foo = require("./foo");

There's also a simple API which can be accessed from the move module:

    var move = require("move");
    console.log(move.compile("bar = ^{ 5 * Math.PI }"));
    // Output:
    //   var bar;
    //   bar = function bar() {
    //     return 5 * Math.PI;
    //   };

If you want to use move in a web browser, simply use and include the `browser/move.js` file (no dependencies). Including this file will export a single global symbol called "move" (`window.move`) which contains the Move library (see `lib/index.js`) including functionality for compiling and executing Move code as well as providing the ES5 normalizing but small runtime library. Have a look at `browser/try/index.html` for inspiration.

## Differences to JavaScript

- **Functions** are declared using one single expression: `^(arg1){...}` and can be called using either **keyword arguments** or positional arguments. Functions without arguments can be written as `^{...` or `^(){...` (parenthesis are optional).
  
  - In JavaScript, there are two different ways to define a function: using the function expression and the function declaration statement, the latter having subtle restrictions. Move only has function expressions and all but strictly anonymous functions are named, providing a richer stack trace when debugging.
  
  - As functions, or lambdas, are the key awesomeness of JavaScript and is a very light-weight thing, the "function" keyword and boilerplate argument parens just need to be easier to write. Move uses the `^` keyword and does not enforce `()` for argument-less functions.

  - The last producing statement in a function is automatically returned.

  - Functions can be called using the `foo {key: value}` syntax, passing arguments by name. This greatly increases code readability.

  - Functions can be called using the `foo value` syntax, passing a single argument. Passing a single argument is a common use-case (e.g. `print value`) and works nicely together with chaining to produce flow control-style functions like for instance the built-in `repeat` function.

  - When defining functions, any argument can be given a default value using either `:` or `=`. E.g. `foo = ^(bar, baz: 4, names=[], age) {...`.

- **Variables** are implicitly declared -- Move will automatically declare (i.e. "create and attach") a newfound variable in the scope which it first was used. The use of "var" produces a syntax error.

- **No commas** required to terminate expressions. Move will determine when a comma is needed so you don't have to (and the code gets more readable).

- No type-coercing **equality operators** -- in Move, `==` does not perform type coercion and behaves just like `===` in JavaScript. Same goes for `!=`.

- **@-shorthand** for accessing properties of the `this` object. E.g. `this.foo = 5` can be written as `@foo = 5`.

- **Importing** CommonJS modules can be done using the `import` statement. E.g. rather than the tedious `var module1 = require("module1")` boilerplate, you can write `import module1`

- **Exporting** CommonJS modules is aided by the `export` statement. E.g. instead of writing `var foo = exports.foo = function () {...` you can write `export foo = ^{...` (or even `export foo` if `foo` is defined elsewhere).

- A small runtime library makes Move **ES5 normalized** even in non-ES5 environments. This means less feature probing and less boiler-plate code. Things like `Array.isArray`, `Object.create` and `String.prototype.trim` are all guaranteed to be available and function according to the ES5 standard.

Move is **designed for humans** which is the reason for why things like variable declarations and statement terminators has been removed -- they are simply not part of the essentials or essence of what a programmer should be thinking about. The computer is, or at least should be, better at deciding those things.

Most features mentioned above can be toggled in the Move compiler. For instance, compiling code with the `raw` option set to `true` will generate free-standing/self-hosted JavaScript. It's also possible to toggle language features, like setting the `keywordArguments` to `false` which disabled the use of keyword arguments. See `lib/index.js` (the "compile" function) for a complete list of options.

## License (MIT)

Move incorporates some third-party source, namely a derivation of [UglifyJS](https://github.com/mishoo/UglifyJS). These sources have a separate license embedded into their heads.

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
