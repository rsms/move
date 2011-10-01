---
layout: none
---

## Usage

Move can run in web browsers and "interpreters" like [Node.js](http://nodejs.org/). Move has been designed so that your code can be run in web browsers and "interpreters" without any changes -- your code is always running in an ES5 environment with a CommonJS module system.

Jump to:

- [Using Move in web browsers](#Using+Move+in+web+browsers)
- [Using Move in Node.js](#Using+Move+in+Node.js)
- [Using Move from the command line](#Using+Move+from+the+command+line)


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

The Move module itself is available as the global variable `Move` (technically a property of `window`). This module provides access to preprocessors, the parser & compiler and version info. It also houses the Move runtime library (`Move.runtime`) which can be manipulated. An example of evaluating some Move code:
<samp>"function () {
  return print("Hello");
}"</samp>

    Move.eval '^{ print "Hello" }'

This is available in both Move-land *and JavaScript-land*:

    Move.eval('^{ print "Hello" }');


### Using Move in Node.js

First up; install Move through [NPM](http://npmjs.org/):

    npm install move

Then, `require('move');` and simply write any module you wish in Move and name the file with a ".mv" extension. From there everything behaves as normal in Node.js (e.g. defining a foo.mv module and later doing `var foo = require('foo');` works as expected).

To run Move code directly from the command line, use the `move` program:

    move hello.mv

Note that you can not load Move code directly through `node` since Node has no knowledge about how to compile Move code. The `move` program simply registers the Move compiler with Node's module loading system and then loads your module.


### Using Move from the command line

When you install move for Node.js, you will have access to a `move` command line client program.

To see a list of available commands, run `move --help`:

<pre class="wide">
$ move --help
Usage: move [global options] &lt;command&gt; [command arguments ..]
       move [global options] &lt;filename&gt;
Global options:
  --help, -h       Show this help message.
Commands:
  build            Build a Move web app.
  build-weblib     Build the Move library for web browsers
  compile          Parse and compile Move code.
  run              Run a Move program.
  version          Print version and exit.
  help             Display help for a command.
</pre>

To show help for a specific command, run `move command --help`:

<pre class="wide">
$ move run --help
Usage: move run [options] &lt;filename&gt; [..]
Options:
  --optimization-level, -O &lt;i&gt;       Optimization level. Defaults to 0 (basic).
  --help, -h                         Show this message
</pre>

Execute a move program:

    move foo/bar.mv
    move run foo/bar.mv

Compile move code to JavaScript:

    move compile foo/bar.mv
    move compile --output foo/bar.js foo/bar.mv

The compile command can do a lot more than just compiling Move code. One of the most useful features is the ability to "bundle" a source tree of Move and JavaScript into a name-spaced (CommonJS modules), single JavaScript file. Imagine the following source tree:

    main.mv
    lib/bar.js
    lib/scrap.txt
    src/index.mv
    src/foo.mv
    src/cat/index.mv
    src/cat/zelda.js

Now, we'll bundle these files:

<pre class="wide">
move compile --bundle --output bundle.js --basedir src main.mv src lib/*.js
</pre>

Which will write something like this to `bundle.js`:

<pre class="wide">
Move.require.define("main","main.mv",function(require,module,exports) {
  // code generated from main.mv
});
Move.require.define("lib/bar","lib/bar.js",function(require,module,exports) {
  // code generated from lib/bar.js
});
Move.require.define("","src/index.mv",function(require,module,exports) {
  // code generated from src/index.mv
});
Move.require.define("foo","src/foo.mv",function(require,module,exports) {
  // code generated from src/foo.mv
});
Move.require.define("cat","src/cat/index.mv",function(require,module,exports) {
  // code generated from src/cat/index.mv
});
Move.require.define("cat/zelda","src/cat/zelda.js",function(require,module,exports) {
  // code generated from src/cat/zelda.js
});
(function(){
  // code that executes the "" module when the DOM is ready
})();
</pre>

Note that this file can now be imported into a document:

    <head>
      <script src="move.js"></script>
      <script src="bundle.js"></script>
      ...

