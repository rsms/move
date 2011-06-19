---
layout: none
---

## Usage

Move can run in web browsers and "interpreters" like [Node.js](http://nodejs.org/). Move has been designed so that your code can be run in web browsers and "interpreters" without any changes -- your code is always running in an ES5 environment with a CommonJS module system.


### Using Move in web browsers

To run Move in a web browser, you simply include [move.js](/move.js):

    <script src="{{ site.url }}/move.js"></script>

Move code can then be embedded, which will execute directly after the DOM has loaded:

    <script type="text/move">
    print 'Hello worlds!'
    </script>

If you specify the `module` attribute, the code defines a module rather than execute the code:

    <script type="text/move" module="foo">
    export sayHello = ^{ print 'Hello worlds!' }
    </script>

It's then possible to `import` that module from other code:

    <script type="text/move">
    import foo
    foo.sayHello()
    </script>

Modules can also be remotely imported:

    <script type="text/move" src="foo.mv"></script>

You don't have to care about the order in which you define your modules. The only thing you need to think about is where you execute embedded code.

#### Complete example

    <script src="{{ site.url }}/move.js"></script>
    <script type="text/move" module="bar">
    import foo, capitalize
    export sayHello = ^(name) {
      print foo.makeHello capitalize name
    }
    </script>
    <script type="text/move" src="capitalize.mv"></script>
    <script type="text/move" module="foo">
    export makeHello = ^(name) { 'Hello '+name+'!' }
    </script>
    <script type="text/move">
    import bar
    bar.sayHello 'worlds'
    </script>

When the DOM loads, "Hello Worlds!" is printed to the console.

The Move module itself is available as the global variable `move` (technically a property of `window`). This module provides access to preprocessors, the parser & compiler and version info. It also houses the Move runtime library (`move.runtime`) which can be manipulated. An example of evaluating some Move code:
<samp>"function () {
  return print("Hello");
}"</samp>

    move.eval '^{ print "Hello" }'

This is available in both Move-land *and JavaScript-land*:

    move.eval('^{ print "Hello" }');


### Using Move in Node.js

First up; install Move through [NPM](http://npmjs.org/):

    npm install move

Then, `require('move');` and simply write any module you wish in Move and name the file with a ".mv" extension. From there everything behaves as normal in Node.js (e.g. defining a foo.mv module and later doing `var foo = require('foo');` works as expected).

To run Move code directly from the command line, use the `move` program:

    $ move hello.mv

Note that you can not load Move code directly through `node` since Node has no knowledge about how to compile Move code. The `move` program simply registers the Move compiler with Node's module loading system and then loads your module.

