## 0.4.4

- The "import" expression now supports relative imports (e.g. `import .foo, ...bar/baz` is equivalent to `foo = require './foo', baz = require '../../bar/baz'`).
- The EHTML preprocessor now supports implicit view constructor `createView`
- The global variable `__move` has been deprecated. Use the global variable `Move` instead.
- Added a new runtime function "dprint" which is similar to "print" but should be used for debugging and is prefixed by the calling module's id (e.g. `dprint message` is equivalent to `print '['+module.id']', message`).
- Changed Object.prototype.forEach to by default iterate over all properties, not just the object's own properties. The extend runtime function has also changed because of this -- by default the extend function now reads all properties (traverses the complete prototype chain) from the source object.
- EHTML separated into two components (preprocessor and runtime library), making it available from the move-rt library.
- The "compile" CLI command has changed:
  - Changed `-b` short option as alias for `--bundle-standalone` to alias for `--bundle`
  - Renamed `-C` short option as alias for `--basedir` to `-d`
  - Added option `--auto`, `-a` which when set keeps the program running and automatically re-compiles when any source file changes.
  - Added option `--silent` to disable outputting of informational messages
  - Changed behavior: When passing `--basedir` but no input files, all move files found in the base directory are used as input. This enables things like `move compile -abd client/src -o public/bundle.js` to automatically compile all move files in a directory when they change and produce a bundle.
- The "create" runtime function no longer supports passing a constructor function. Whatever object is passed -- function type or not -- the resulting object will have the passed object as its prototype.
- The "extend" runtime function no longer supports passing a modifier function. Whatever object is passed -- function type or not -- the resulting object will receive a copy of the passed object's values.
- NPM installation improvements


## 0.4.3

TODO (sorry, changes weren't summarized before 0.4.4)
