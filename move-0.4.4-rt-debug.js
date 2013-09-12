// Move for web browers
if (!window.Move) window.Move = (function(){

if (typeof window.global === 'undefined')
  window.global = window;

// CommonJS compatible module loading.
// (Except from require.paths, it's compliant with spec 1.1.1.)
var Require = function Require(parentExports) {
  
  // normalize an array of path components
  function normalizeArray(parts) {
    var up = 0;
    for (var i = parts.length; i >= 0; i--) {
      var last = parts[i];
      if (last == '.') {
        parts.splice(i, 1);
      } else if (last === '..') {
        parts.splice(i, 1);
        up++;
      } else if (up) {
        parts.splice(i, 1);
        up--;
      }
    }
    return parts;
  }
  
  // normalize an id
  function normalizeId(id, parentId) {
    id = id.replace(/\/+$/g, '');
    var components = (parentId ? parentId + '/../' + id : id).split('/');
    return normalizeArray(components).join('/');
  }
  
  // normalize a url
  function normalizeUrl(url, baseLocation) {
    if (!(/^\w+:/).test(url)) {
      var u = baseLocation.protocol+'//'+baseLocation.hostname;
      if (baseLocation.port && baseLocation.port !== 80) {
        u += ':'+baseLocation.port;
      }
      var path = baseLocation.pathname;
      if (url.charAt(0) === '/') {
        url = u + normalizeArray(url.split('/')).join('/');
      } else {
        path += ((path.charAt(path.length-1) === '/') ? '' : '/../') + url;
        url = u + normalizeArray(path.split('/')).join('/');
      }
    }
    return url;
  }
  
  // define a constant (read-only) value property
  var defineConstant;
  if (Object.defineProperty) {
    defineConstant = function (obj, name, value) {
      Object.defineProperty(obj, name, {value: value, writable: false,
        enumerable: true, configurable: false});
    }
  } else {
    defineConstant = function (obj, name, value) { obj[name] = value; }
  }
  
  // require/load/import a module
  // require(id[, parentId]) -> [object module-api]
  // @throws Error /module not found (json-rep-of-id)/
  function require (id, parentId, parentURI) {
    var originalInputId = id; // for "not found" error message
    if (id.charAt(0) === '.') {
      if (parentURI && parentURI.indexOf(parentId+'/index') !== -1)
        parentId += '/index'
      var id1 = id;
      id = normalizeId(id, parentId);
    }
    if (!require.modules.hasOwnProperty(id)) {
      throw new Error('Module not found '+JSON.stringify(originalInputId));
    }
    var mod = require.modules[id];
    if (mod.exports === undefined) {
      var _require = function (_id) {
        return require(_id, id, mod.uri);
      };
      defineConstant(_require, 'main', require.main);
      var block = mod.block; delete mod.block;
      mod.exports = {};
      if (require.initFilter) {
        block = require.initFilter(block);
      }
      block(_require, mod, mod.exports);
    }
    return mod.exports;
  }
  
  // define a module
  // define(String id, [String uri,] block(require, module, exports){...})
  function define (id, uri, block) {
    if (typeof uri === 'function') {
      block = uri; uri = null;
    }
    var mod = {block: block};
    defineConstant(mod, 'id', String(id));
    if (uri) {
      defineConstant(mod, 'uri', String(uri));
    }
    require.modules[mod.id] = mod;
    return mod;
  }
  
  // modules keyed by id
  require.modules = {};
  // search paths -- disabled until we use/need this
  //require.paths = [];
  // main module, accessible from require.main
  var mainModule = define('');
  delete mainModule.block;
  mainModule.exports = parentExports || {};
  defineConstant(require, 'main', mainModule);
  // the define function
  require.define = define;

  return require;
};

// Module system
var module, modules = {};
var _require = Require();

_require.define("runtime/es5_array","runtime/es5_array.js",function(require, module, exports, __filename, __dirname){if (!Array.isArray)
Array.isArray = function isArray(obj) {
  return (obj instanceof Array) ||
         Object.prototype.toString.call(obj) === "[object Array]";
};


if (!Array.prototype.indexOf)
Array.prototype.indexOf = function indexOf(value, begin) {
  var i, L = this.length;
  for (i = +begin || 0; i < L; ++i) {
    if (this[i] === value) return i;
  }
  return -1;
};

if (!Array.prototype.lastIndexOf)
Array.prototype.lastIndexOf = function lastIndexOf(value, begin) {
  var i = Math.min(this.length, +begin || 0);
  for (; i !== -1; --i) {
    if (this[i] === value) return i;
  }
  return -1;
};

if (!Array.prototype.filter)
Array.prototype.filter = function filter(block, ctx) {
  var values = [];
  for (var i = 0; i < this.length; i++) {
    if (block.call(ctx, this[i])) {
      values.push(this[i]);
    }
  }
  return values;
};

if (!Array.prototype.forEach)
Array.prototype.forEach = function forEach(block, ctx) {
  var len = this.length >>> 0;
  for (var i = 0; i < len; ++i) {
    if (i in this) {
      block.call(ctx, this[i], i, this);
    }
  }
};

if (!Array.prototype.every)
Array.prototype.every = function every(block, ctx) {
  var len = this.length >>> 0;
  for (var i = 0; i < len; ++i) {
    if (i in this && !block.call(ctx, this[i], i, this))
      return false;
  }
  return true;
};

if (!Array.prototype.some)
Array.prototype.some = function some(block, ctx) {
  var len = this.length >>> 0;
  for (var i = 0; i < len; ++i) {
    if (i in this && block.call(ctx, this[i], i, this))
      return true;
  }
  return false;
};

if (!Array.prototype.map)
Array.prototype.map = function map(fun, ctx) {
  var len = this.length >>> 0, res = new Array(len);
  for (var i = 0; i < len; ++i) {
    res[i] = fun.call(ctx, this[i], i, this);
  }
  return res;
};

if (!Array.prototype.reduce)
Array.prototype.reduce = function reduce(fun /*, initial*/) {
  var len = this.length >>> 0, i = 0, rv;
  // no value to return if no initial value and an empty array
  if (len === 0 && arguments.length === 1) throw new TypeError();
  if (arguments.length >= 2) {
    rv = arguments[1];
  } else {
    do {
      if (i in this) {
        rv = this[i++];
        break;
      }
      // if array contains no values, no initial value to return
      if (++i >= len) throw new TypeError();
    } while (true);
  }
  for (; i < len; i++) {
    if (i in this) {
      rv = fun.call(null, rv, this[i], i, this);
    }
  }
  return rv;
};

// TODO: reduceRight

if (!Array.prototype.unshift)
Array.prototype.unshift = function() {
  this.reverse();
  var i = arguments.length;
  while (i--)
    this.push(arguments[i]);
  this.reverse();
  return this.length;
};
});
_require.define("runtime/es5_date","runtime/es5_date.js",function(require, module, exports, __filename, __dirname){if (!Date.now)
Date.now = function now() { return (new Date).getTime(); };

if (!Date.prototype.getTimezoneOffset)
Date.prototype.getTimezoneOffset = function getTimezoneOffset() {
  if (this._timezoneOffsetStd === undefined) {
    var date1 = new Date(this.getFullYear(), this.getMonth(), this.getDate(),
                         0,0,0,0),
        temp = date1.toGMTString(),
        date2 = new Date(temp.substring(0, temp.lastIndexOf(" ")-1));
    this._timezoneOffsetStd = (date2 - date1) / 60000;
  }
  return this._timezoneOffsetStd;
};
});
_require.define("runtime/es5_json","runtime/es5_json.js",function(require, module, exports, __filename, __dirname){/*
    http://www.JSON.org/json2.js
    2011-01-18

    Public Domain.

    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

    See http://www.JSON.org/js.html


    This code should be minified before deployment.
    See http://javascript.crockford.com/jsmin.html

    USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
    NOT CONTROL.


    This file creates a global JSON object containing two methods: stringify
    and parse.

        JSON.stringify(value, replacer, space)
            value       any JavaScript value, usually an object or array.

            replacer    an optional parameter that determines how object
                        values are stringified for objects. It can be a
                        function or an array of strings.

            space       an optional parameter that specifies the indentation
                        of nested structures. If it is omitted, the text will
                        be packed without extra whitespace. If it is a number,
                        it will specify the number of spaces to indent at each
                        level. If it is a string (such as '\t' or '&nbsp;'),
                        it contains the characters used to indent at each level.

            This method produces a JSON text from a JavaScript value.

            When an object value is found, if the object contains a toJSON
            method, its toJSON method will be called and the result will be
            stringified. A toJSON method does not serialize: it returns the
            value represented by the name/value pair that should be serialized,
            or undefined if nothing should be serialized. The toJSON method
            will be passed the key associated with the value, and this will be
            bound to the value

            For example, this would serialize Dates as ISO strings.

                Date.prototype.toJSON = function (key) {
                    function f(n) {
                        // Format integers to have at least two digits.
                        return n < 10 ? '0' + n : n;
                    }

                    return this.getUTCFullYear()   + '-' +
                         f(this.getUTCMonth() + 1) + '-' +
                         f(this.getUTCDate())      + 'T' +
                         f(this.getUTCHours())     + ':' +
                         f(this.getUTCMinutes())   + ':' +
                         f(this.getUTCSeconds())   + 'Z';
                };

            You can provide an optional replacer method. It will be passed the
            key and value of each member, with this bound to the containing
            object. The value that is returned from your method will be
            serialized. If your method returns undefined, then the member will
            be excluded from the serialization.

            If the replacer parameter is an array of strings, then it will be
            used to select the members to be serialized. It filters the results
            such that only members with keys listed in the replacer array are
            stringified.

            Values that do not have JSON representations, such as undefined or
            functions, will not be serialized. Such values in objects will be
            dropped; in arrays they will be replaced with null. You can use
            a replacer function to replace those with JSON values.
            JSON.stringify(undefined) returns undefined.

            The optional space parameter produces a stringification of the
            value that is filled with line breaks and indentation to make it
            easier to read.

            If the space parameter is a non-empty string, then that string will
            be used for indentation. If the space parameter is a number, then
            the indentation will be that many spaces.

            Example:

            text = JSON.stringify(['e', {pluribus: 'unum'}]);
            // text is '["e",{"pluribus":"unum"}]'


            text = JSON.stringify(['e', {pluribus: 'unum'}], null, '\t');
            // text is '[\n\t"e",\n\t{\n\t\t"pluribus": "unum"\n\t}\n]'

            text = JSON.stringify([new Date()], function (key, value) {
                return this[key] instanceof Date ?
                    'Date(' + this[key] + ')' : value;
            });
            // text is '["Date(---current time---)"]'


        JSON.parse(text, reviver)
            This method parses a JSON text to produce an object or array.
            It can throw a SyntaxError exception.

            The optional reviver parameter is a function that can filter and
            transform the results. It receives each of the keys and values,
            and its return value is used instead of the original value.
            If it returns what it received, then the structure is not modified.
            If it returns undefined then the member is deleted.

            Example:

            // Parse the text. Values that look like ISO date strings will
            // be converted to Date objects.

            myData = JSON.parse(text, function (key, value) {
                var a;
                if (typeof value === 'string') {
                    a =
/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
                    if (a) {
                        return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
                            +a[5], +a[6]));
                    }
                }
                return value;
            });

            myData = JSON.parse('["Date(09/09/2001)"]', function (key, value) {
                var d;
                if (typeof value === 'string' &&
                        value.slice(0, 5) === 'Date(' &&
                        value.slice(-1) === ')') {
                    d = new Date(value.slice(5, -1));
                    if (d) {
                        return d;
                    }
                }
                return value;
            });


    This is a reference implementation. You are free to copy, modify, or
    redistribute.
*/

/*jslint evil: true, strict: false, regexp: false */

/*members "", "\b", "\t", "\n", "\f", "\r", "\"", JSON, "\\", apply,
    call, charCodeAt, getUTCDate, getUTCFullYear, getUTCHours,
    getUTCMinutes, getUTCMonth, getUTCSeconds, hasOwnProperty, join,
    lastIndex, length, parse, prototype, push, replace, slice, stringify,
    test, toJSON, toString, valueOf
*/


// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

var JSON = global.JSON;
if (typeof JSON !== 'object' ||
    typeof JSON.stringify !== 'function' ||
    typeof JSON.parse !== 'function') {
  JSON = global.JSON = {};

  (function () {
      "use strict";

      function f(n) {
          // Format integers to have at least two digits.
          return n < 10 ? '0' + n : n;
      }

      if (typeof Date.prototype.toJSON !== 'function') {

          Date.prototype.toJSON = function (key) {

              return isFinite(this.valueOf()) ?
                  this.getUTCFullYear()     + '-' +
                  f(this.getUTCMonth() + 1) + '-' +
                  f(this.getUTCDate())      + 'T' +
                  f(this.getUTCHours())     + ':' +
                  f(this.getUTCMinutes())   + ':' +
                  f(this.getUTCSeconds())   + 'Z' : null;
          };

          String.prototype.toJSON      =
              Number.prototype.toJSON  =
              Boolean.prototype.toJSON = function (key) {
                  return this.valueOf();
              };
      }

      var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
          escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
          gap,
          indent,
          meta = {    // table of character substitutions
              '\b': '\\b',
              '\t': '\\t',
              '\n': '\\n',
              '\f': '\\f',
              '\r': '\\r',
              '"' : '\\"',
              '\\': '\\\\'
          },
          rep;


      function quote(string) {

  // If the string contains no control characters, no quote characters, and no
  // backslash characters, then we can safely slap some quotes around it.
  // Otherwise we must also replace the offending characters with safe escape
  // sequences.

          escapable.lastIndex = 0;
          return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
              var c = meta[a];
              return typeof c === 'string' ? c :
                  '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
          }) + '"' : '"' + string + '"';
      }


      function str(key, holder) {

  // Produce a string from holder[key].

          var i,          // The loop counter.
              k,          // The member key.
              v,          // The member value.
              length,
              mind = gap,
              partial,
              value = holder[key];

  // If the value has a toJSON method, call it to obtain a replacement value.

          if (value && typeof value === 'object' &&
                  typeof value.toJSON === 'function') {
              value = value.toJSON(key);
          }

  // If we were called with a replacer function, then call the replacer to
  // obtain a replacement value.

          if (typeof rep === 'function') {
              value = rep.call(holder, key, value);
          }

  // What happens next depends on the value's type.

          switch (typeof value) {
          case 'string':
              return quote(value);

          case 'number':

  // JSON numbers must be finite. Encode non-finite numbers as null.

              return isFinite(value) ? String(value) : 'null';

          case 'boolean':
          case 'null':

  // If the value is a boolean or null, convert it to a string. Note:
  // typeof null does not produce 'null'. The case is included here in
  // the remote chance that this gets fixed someday.

              return String(value);

  // If the type is 'object', we might be dealing with an object or an array or
  // null.

          case 'object':

  // Due to a specification blunder in ECMAScript, typeof null is 'object',
  // so watch out for that case.

              if (!value) {
                  return 'null';
              }

  // Make an array to hold the partial results of stringifying this object value.

              gap += indent;
              partial = [];

  // Is the value an array?

              if (Object.prototype.toString.apply(value) === '[object Array]') {

  // The value is an array. Stringify every element. Use null as a placeholder
  // for non-JSON values.

                  length = value.length;
                  for (i = 0; i < length; i += 1) {
                      partial[i] = str(i, value) || 'null';
                  }

  // Join all of the elements together, separated with commas, and wrap them in
  // brackets.

                  v = partial.length === 0 ? '[]' : gap ?
                      '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                      '[' + partial.join(',') + ']';
                  gap = mind;
                  return v;
              }

  // If the replacer is an array, use it to select the members to be stringified.

              if (rep && typeof rep === 'object') {
                  length = rep.length;
                  for (i = 0; i < length; i += 1) {
                      k = rep[i];
                      if (typeof k === 'string') {
                          v = str(k, value);
                          if (v) {
                              partial.push(quote(k) + (gap ? ': ' : ':') + v);
                          }
                      }
                  }
              } else {

  // Otherwise, iterate through all of the keys in the object.

                  for (k in value) {
                      if (Object.hasOwnProperty.call(value, k)) {
                          v = str(k, value);
                          if (v) {
                              partial.push(quote(k) + (gap ? ': ' : ':') + v);
                          }
                      }
                  }
              }

  // Join all of the member texts together, separated with commas,
  // and wrap them in braces.

              v = partial.length === 0 ? '{}' : gap ?
                  '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
                  '{' + partial.join(',') + '}';
              gap = mind;
              return v;
          }
      }

  // If the JSON object does not yet have a stringify method, give it one.

      if (typeof JSON.stringify !== 'function') {
          JSON.stringify = function (value, replacer, space) {

  // The stringify method takes a value and an optional replacer, and an optional
  // space parameter, and returns a JSON text. The replacer can be a function
  // that can replace values, or an array of strings that will select the keys.
  // A default replacer method can be provided. Use of the space parameter can
  // produce text that is more easily readable.

              var i;
              gap = '';
              indent = '';

  // If the space parameter is a number, make an indent string containing that
  // many spaces.

              if (typeof space === 'number') {
                  for (i = 0; i < space; i += 1) {
                      indent += ' ';
                  }

  // If the space parameter is a string, it will be used as the indent string.

              } else if (typeof space === 'string') {
                  indent = space;
              }

  // If there is a replacer, it must be a function or an array.
  // Otherwise, throw an error.

              rep = replacer;
              if (replacer && typeof replacer !== 'function' &&
                      (typeof replacer !== 'object' ||
                      typeof replacer.length !== 'number')) {
                  throw new Error('JSON.stringify');
              }

  // Make a fake root object containing our value under the key of ''.
  // Return the result of stringifying the value.

              return str('', {'': value});
          };
      }


  // If the JSON object does not yet have a parse method, give it one.

      if (typeof JSON.parse !== 'function') {
          JSON.parse = function (text, reviver) {

  // The parse method takes a text and an optional reviver function, and returns
  // a JavaScript value if the text is a valid JSON text.

              var j;

              function walk(holder, key) {

  // The walk method is used to recursively walk the resulting structure so
  // that modifications can be made.

                  var k, v, value = holder[key];
                  if (value && typeof value === 'object') {
                      for (k in value) {
                          if (Object.hasOwnProperty.call(value, k)) {
                              v = walk(value, k);
                              if (v !== undefined) {
                                  value[k] = v;
                              } else {
                                  delete value[k];
                              }
                          }
                      }
                  }
                  return reviver.call(holder, key, value);
              }


  // Parsing happens in four stages. In the first stage, we replace certain
  // Unicode characters with escape sequences. JavaScript handles many characters
  // incorrectly, either silently deleting them, or treating them as line endings.

              text = String(text);
              cx.lastIndex = 0;
              if (cx.test(text)) {
                  text = text.replace(cx, function (a) {
                      return '\\u' +
                          ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                  });
              }

  // In the second stage, we run the text against regular expressions that look
  // for non-JSON patterns. We are especially concerned with '()' and 'new'
  // because they can cause invocation, and '=' because it can cause mutation.
  // But just to be safe, we want to reject all unexpected forms.

  // We split the second stage into 4 regexp operations in order to work around
  // crippling inefficiencies in IE's and Safari's regexp engines. First we
  // replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
  // replace all simple value tokens with ']' characters. Third, we delete all
  // open brackets that follow a colon or comma or that begin the text. Finally,
  // we look to see that the remaining characters are only whitespace or ']' or
  // ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

              if (/^[\],:{}\s]*$/
                      .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
                          .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                          .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

  // In the third stage we use the eval function to compile the text into a
  // JavaScript structure. The '{' operator is subject to a syntactic ambiguity
  // in JavaScript: it can begin a block or an object literal. We wrap the text
  // in parens to eliminate the ambiguity.

                  j = eval('(' + text + ')');

  // In the optional fourth stage, we recursively walk the new structure, passing
  // each name/value pair to a reviver function for possible transformation.

                  return typeof reviver === 'function' ?
                      walk({'': j}, '') : j;
              }

  // If the text is not JSON parseable, then a SyntaxError is thrown.

              throw new SyntaxError('JSON.parse');
          };
      }
  }());
}});
_require.define("runtime/es5_object","runtime/es5_object.js",function(require, module, exports, __filename, __dirname){var slice = Array.prototype.slice.call;

if (!Object.create)
Object.create = function create(proto, props) {
  var Ctor = function Ctor() {
    if (props && Object.defineProperties) Object.defineProperties(this, props);
  };
  Ctor.prototype = proto;
  return new Ctor;
};

if (!Object.keys)
Object.keys = function keys(obj){
  var keys = [];
  for (var k in obj) keys.push(k);
  return keys;
};

if (!Object.getOwnPropertyNames)
Object.getOwnPropertyNames = function getOwnPropertyNames() {
  return Object.keys.apply(this, slice(arguments));
};

if (!Object.getOwnPropertyDescriptor)
Object.getOwnPropertyDescriptor = function getOwnPropertyDescriptor(obj, prop) {
  if (obj.hasOwnProperty(prop)) {
    return {configurable:true, enumerable:true, value:obj[prop],
            writable:true};
  }
};

if (!Object.prototype.hasOwnProperty)
Object.prototype.hasOwnProperty = function (k) {
  return (k in this);
};

if (!Object.defineProperty) {
  // impl 1 -- based on __define{G,S}etter__
  if (Object.prototype.__defineGetter__ && Object.prototype.__defineSetter__) {
    Object.defineProperty = function(obj, prop, desc) {
      if (typeof desc === "object") { // check for desc object
        if (desc.hasOwnProperty("value")) {
          if (!obj.__lookupGetter__(prop) && !obj.__lookupSetter__(prop)) {
            obj[prop] = desc.value; // no pre-existing accessors
          } // todo: else
          if ((desc.hasOwnProperty("get") || desc.hasOwnProperty("set"))) {
            // desc has a value prop but accessor already exists. MSIE throws
            // the following message, so let's do the same:
            throw new TypeError("Object doesn't support this action");
          }
        } else {
          if (typeof desc.get === "function") {
            obj.__defineGetter__(prop, desc.get);
          }
          if (typeof desc.set === "function") {
            obj.__defineSetter__(prop, desc.set);
          }
        }
      }
      return obj;
    };
  }/* DISABLED since this implementation is not complete:
  else {
    // impl 2 -- only set values and throw TypeError for getters/setters
    Object.defineProperty = function (obj, prop, desc) {
      if ((desc.hasOwnProperty("get") || desc.hasOwnProperty("set"))) {
        throw new Error('This runtime does not support dynamic properties');
      }
      if (desc.hasOwnProperty("value")) {
        obj[prop] = desc.value;
      }
    };
  }*/
}

if (!Object.defineProperties && Object.defineProperty)
Object.defineProperties = function (obj, props) {
  for (var prop in props) {
    Object.defineProperty(obj, prop, props[prop]);
  }
};

// Unimplemented Object functions:
// - preventExtensions
// - isExtensible
// - seal
// - isSealed
// - freeze
// - isFrozen

});
_require.define("runtime/es5_string","runtime/es5_string.js",function(require, module, exports, __filename, __dirname){if (!String.prototype.trim)
String.prototype.trim = function trim() {
  return this.replace(/^(?:\s|\u00A0)+/, '').replace(/(?:\s|\u00A0)+$/, '');
};

if (!String.prototype.trimLeft)
String.prototype.trimLeft = function trimLeft() {
  return this.replace(/^(?:\s|\u00A0)+/, '');
};

if (!String.prototype.trimRight)
String.prototype.trimRight = function trimRight() {
  return this.replace(/(?:\s|\u00A0)+$/, '');
};
});
_require.define("runtime","runtime/index.js",function(require, module, exports, __filename, __dirname){require('./runtime_string');

// Unless imported by the core module, global.Move is undefined
if (!global.Move) global.Move = {};

// Hack to provide a stub runtime object for things in the runtime lib themselves
global.Move.runtime = {
  _MoveKWArgsT: require('./symbols')._MoveKWArgsT,
  dprinter: function(){return function(){};}
};

// The actual runtime module
global.Move.runtime = require('./runtime_move');

// Load built-in preprocessors' runtime support
require('./preprocessors/ehtml');
});
_require.define("runtime/preprocessors/ehtml","runtime/preprocessors/ehtml.mv",function(require, module, exports, __filename, __dirname){(function(){"use strict";
  var M, _MoveKWArgsT, Text, extend, create, print, repeat, after, JSON, __class, EventEmitter, hasDOM, EHTML, hasClassList;
  M = Move.runtime, _MoveKWArgsT = M._MoveKWArgsT, Text = M.Text, extend = M.extend, create = M.create, print = M.print, repeat = M.repeat, after = M.after, JSON = M.JSON, __class = M.__class, EventEmitter = M.EventEmitter;
  hasDOM = typeof document !== "undefined";
  if (!hasDOM) {
    EHTML = function EHTML(html) {
      html !== null && typeof html === "object" && html.__kw === _MoveKWArgsT && (arguments.keywords = html, html = html.html);
      return {
        innerHTML: html
      };
    };
    return;
  }
  EHTML = function EHTML(html) {
    html !== null && typeof html === "object" && html.__kw === _MoveKWArgsT && (arguments.keywords = html, html = html.html);
    var el;
    if (!EHTML.spawnerElement) EHTML.spawnerElement = document.createElement("div");
    EHTML.spawnerElement.innerHTML = html;
    el = EHTML.spawnerElement.firstChild;
    return el;
  };
  Move.EHTML = EHTML;
  hasClassList = document.body && document.body.classList;
  if (hasClassList) {
    EHTML.createViewImpl = function createViewImpl() {
      var el;
      if (this.createView) {
        el = this.createView.apply(this, arguments);
        if (el && el instanceof Element) el.classList.add(this.__domid);
      }
      return el;
    };
  } else {
    EHTML.createViewImpl = function createViewImpl() {
      var el;
      if (this.createView) {
        el = this.createView.apply(this, arguments);
        if (el && el instanceof Element) el.className += " " + this.__domid;
      }
      return el;
    };
  }
  if (hasClassList) {
    return EHTML.classNameWrapper = function classNameWrapper(className) {
      className !== null && typeof className === "object" && className.__kw === _MoveKWArgsT && (arguments.keywords = className, className = className.className);
      return function (html) {
        html !== null && typeof html === "object" && html.__kw === _MoveKWArgsT && (arguments.keywords = html, html = html.html);
        var node;
        if (node = Move.EHTML(html)) node.classList.add(className);
        return node;
      };
    };
  } else {
    return EHTML.classNameWrapper = function classNameWrapper(className) {
      className !== null && typeof className === "object" && className.__kw === _MoveKWArgsT && (arguments.keywords = className, className = className.className);
      className = " " + className;
      return function (html) {
        html !== null && typeof html === "object" && html.__kw === _MoveKWArgsT && (arguments.keywords = html, html = html.html);
        var node;
        if (node = Move.EHTML(html)) node.className += className;
        return node;
      };
    };
  }
})();});
_require.define("runtime/runtime_array","runtime/runtime_array.js",function(require, module, exports, __filename, __dirname){// unique() -> list
if (typeof Array.prototype.unique !== 'function')
Array.prototype.unique = function unique() {
  var a = [], i, j, l = this.length;
  for (i=0; i<l; ++i) {
    for (j=i+1; j<l; ++j) {
      if (this[i] === this[j]) {
        j = ++i;
      }
    }
    a.push(this[i]);
  }
  return a;
};

// list[startIndex:endIndex] = value -> list
// _move_setSlice(startIndex, endIndex=@length, value) -> list
if (typeof Array.prototype._move_setSlice != 'function') {
  var _splice = Array.prototype.splice;
  Array.prototype._move_setSlice =
  function _move_setSlice(startIndex, endIndex, value) {
    // splice(index, howMany[, element1[, ...[, elementN]]]) → list
    var length;
    if (endIndex !== undefined) {
      if (typeof endIndex !== 'number')
        throw new TypeError('Second argument must be a number');
      length = endIndex - startIndex;
    } else {
      length = this.length;
    }
    return _splice.apply(this, [startIndex, length].concat(value));
  };
}
});
_require.define("runtime/runtime_class","runtime/runtime_class.mv",function(require, module, exports, __filename, __dirname){(function(){"use strict";
  var M, _MoveKWArgsT, Text, extend, create, print, repeat, after, JSON, __class, EventEmitter, kObjectConstructor, kProtoKey, __class;
  M = Move.runtime, _MoveKWArgsT = M._MoveKWArgsT, Text = M.Text, extend = M.extend, create = M.create, print = M.print, repeat = M.repeat, after = M.after, JSON = M.JSON, __class = M.__class, EventEmitter = M.EventEmitter;
  kObjectConstructor = Object.prototype.constructor;
  kProtoKey = typeof Object.prototype.__proto__ === "object" ? "__proto__" : "prototype";
  exports.__class = __class = function __class() {
    var T, parent, prototype, t, p;
    T = arguments[0];
    if (arguments.length === 3) {
      parent = arguments[1];
      prototype = arguments[2];
      if ((t = typeof prototype) !== "object" && t !== "function") throw TypeError("unexpected type " + t + " of second argument (expected object)");
    } else if (arguments.length === 2) {
      prototype = arguments[1];
      if ((t = typeof prototype) === "function") {
        parent = prototype;
        prototype = undefined;
      } else if (t !== "object") {
        throw TypeError("unexpected type " + t + " of first argument (expected object or function)");
      }
    }
    if (prototype && prototype.__kw === _MoveKWArgsT) delete prototype.__kw;
    if (parent) {
      p = Object.create(parent.prototype || null);
      if (prototype) {
        Object.keys(prototype).forEach(function (key) {
          key !== null && typeof key === "object" && key.__kw === _MoveKWArgsT && (arguments.keywords = key, key = key.key);
          var value;
          if ((value = prototype[key]) !== undefined) return p[key] = value;
        });
      }
      prototype = p;
    }
    T.prototype = prototype || null;
    T.constructor = undefined;
    return T;
  };
  return __class.create = function create() {
    var T, args, object, ctor;
    T = arguments[0];
    args = arguments[1];
    object = Object.create(T.prototype);
    if ((ctor = object.constructor) && ctor !== kObjectConstructor && typeof ctor === "function") {
      ctor.apply(object, args);
    } else if (typeof args[0] === "object") {
      extend(object, args[0]);
    }
    return object;
  };
})();});
_require.define("runtime/runtime_date","runtime/runtime_date.mv",function(require, module, exports, __filename, __dirname){(function(){"use strict";
  var M, _MoveKWArgsT, Text, extend, create, print, repeat, after, JSON, __class, EventEmitter;
  M = Move.runtime, _MoveKWArgsT = M._MoveKWArgsT, Text = M.Text, extend = M.extend, create = M.create, print = M.print, repeat = M.repeat, after = M.after, JSON = M.JSON, __class = M.__class, EventEmitter = M.EventEmitter;
  if (Date.distantFuture === undefined) Date.distantFuture = new Date(359753450957352);
  if (Date.distantPast === undefined) Date.distantPast = new Date(-621356868e5);
  if (!Date.nowUTC) Date.nowUTC = function nowUTC() {
    return (new Date).getUTCTime();
  };
  if (!Date.prototype.getUTCTime) Date.prototype.getUTCTime = function getUTCTime() {
    return this.getTime() - this.getTimezoneOffset();
  };
  if (!Date.prototype.getUTCComponents) return Date.prototype.getUTCComponents = function getUTCComponents() {
    return [ this.getUTCFullYear(), this.getUTCMonth() + 1, this.getUTCDate(), this.getUTCHours(), this.getUTCMinutes(), this.getUTCSeconds(), this.getUTCMilliseconds() ];
  };
})();});
_require.define("runtime/runtime_events","runtime/runtime_events.mv",function(require, module, exports, __filename, __dirname){(function(){"use strict";
  var M, _MoveKWArgsT, Text, extend, create, print, repeat, after, JSON, __class, EventEmitter;
  M = Move.runtime, _MoveKWArgsT = M._MoveKWArgsT, Text = M.Text, extend = M.extend, create = M.create, print = M.print, repeat = M.repeat, after = M.after, JSON = M.JSON, __class = M.__class, EventEmitter = M.EventEmitter;
  EventEmitter = exports.EventEmitter = __class(EventEmitter = function EventEmitter() {
    return __class.create(EventEmitter, arguments);
  }, {
    on: function (event, invoke) {
      event !== null && typeof event === "object" && event.__kw === _MoveKWArgsT && (arguments.keywords = event, invoke = event.invoke, event = event.event);
      var listeners;
      if (!this.eventListeners) {
        Object.defineProperty(this, "eventListeners", {
          value: {}
        });
        return this.eventListeners[event] = [ invoke ];
      } else if (!(listeners = this.eventListeners[event])) {
        return this.eventListeners[event] = [ invoke ];
      } else {
        return listeners.push(invoke);
      }
    },
    emit: function () {
      var event, listeners, args, i, L;
      event = arguments[0];
      if (this.eventListeners && (listeners = this.eventListeners[event])) {
        args = Array.prototype.slice.call(arguments, 1);
        for (i = 0, L = listeners.length; i < L; ++i) {
          listeners[i] && listeners[i].apply(this, args);
        }
      }
    },
    removeEventListener: function (event, callback) {
      event !== null && typeof event === "object" && event.__kw === _MoveKWArgsT && (arguments.keywords = event, callback = event.callback, event = event.event);
      var listeners, i;
      if (this.eventListeners) {
        if (callback && (listeners = this.eventListeners[event])) {
          i = listeners.indexOf(callback);
          return listeners.splice(i, 1);
        } else {
          return this.eventListeners[event] = undefined;
        }
      }
    }
  });
  return exports.EventEmitter.enableFor = function enableFor(object) {
    object !== null && typeof object === "object" && object.__kw === _MoveKWArgsT && (arguments.keywords = object, object = object.object);
    return extend(object, exports.EventEmitter.prototype);
  };
})();});
_require.define("runtime/runtime_inspect","runtime/runtime_inspect.js",function(require, module, exports, __filename, __dirname){/**
 * Copyright 2009, 2010 Ryan Lienhart Dahl. All rights reserved.
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Boolean} showHidden Flag that shows hidden (not enumerable)
 *    properties of objects.
 * @param {Number} depth Depth in which to descend in object. Default is 2.
 * @param {Boolean} colors Flag to turn on ANSI escape codes to color the
 *    output. Default is false (no coloring).
 */
exports.inspect = function(obj, showHidden, depth, colors) {
  var seen = [];

  var /*stylize = function(str, styleType) {
    // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
    var styles =
        { 'bold' : [1, 22],
          'italic' : [3, 23],
          'underline' : [4, 24],
          'inverse' : [7, 27],
          'white' : [37, 39],
          'grey' : [90, 39],
          'black' : [30, 39],
          'blue' : [34, 39],
          'cyan' : [36, 39],
          'green' : [32, 39],
          'magenta' : [35, 39],
          'red' : [31, 39],
          'yellow' : [33, 39] };

    var style =
        { 'special': 'cyan',
          'number': 'blue',
          'boolean': 'yellow',
          'undefined': 'grey',
          'null': 'bold',
          'string': 'green',
          'date': 'magenta',
          // "name": intentionally not styling
          'regexp': 'red' }[styleType];

    if (style) {
      return '\033[' + styles[style][0] + 'm' + str +
             '\033[' + styles[style][1] + 'm';
    } else {
      return str;
    }
  };
  if (! colors) {*/
    stylize = function(str, styleType) { return str; };
  //}

  function format(value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (value && typeof value.inspect === 'function' &&
        // Filter out the util module, it's inspect function is special
        value !== exports && value.inspect !== exports.inspect &&
        // Also filter out any prototype objects using the circular check.
        !(value.constructor && value.constructor.prototype === value)) {
      return value.inspect(recurseTimes);
    }

    // Primitive types cannot have properties
    switch (typeof value) {
      case 'undefined':
        return stylize('undefined', 'undefined');

      case 'string':
        var simple = JSON.stringify(value).replace(/'/g, "\\'")
                                          .replace(/\\"/g, '"')
                                          .replace(/(^"|"$)/g, "'");
        return stylize(simple, 'string');

      case 'number':
        return stylize('' + value, 'number');

      case 'boolean':
        return stylize('' + value, 'boolean');
    }
    // For some reason typeof null is "object", so special case here.
    if (value === null) {
      return stylize('null', 'null');
    }

    // Look up the keys of the object.
    var visible_keys = Object.keys(value);
    var keys = showHidden ? Object.getOwnPropertyNames(value) : visible_keys;

    // Functions without properties can be shortcutted.
    if (typeof value === 'function' && keys.length === 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        var name = value.name ? ': ' + value.name : '';
        return stylize('[Function' + name + ']', 'special');
      }
    }

    // Dates without properties can be shortcutted
    if (isDate(value) && keys.length === 0) {
      return stylize(value.toUTCString(), 'date');
    }

    var base, type, braces;
    // Determine the object type
    if (isArray(value)) {
      type = 'Array';
      braces = ['[', ']'];
    } else {
      type = 'Object';
      braces = ['{', '}'];
    }

    // Make functions say that they are functions
    if (typeof value === 'function') {
      var n = value.name ? ': ' + value.name : '';
      base = (isRegExp(value)) ? ' ' + value : ' [Function' + n + ']';
    } else {
      base = '';
    }

    // Make dates with properties first say the date
    if (isDate(value)) {
      base = ' ' + value.toUTCString();
    }

    if (keys.length === 0) {
      return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        return stylize('[Object]', 'special');
      }
    }

    seen.push(value);

    var output = keys.map(function(key) {
      var name, str;
      if (value.__lookupGetter__) {
        if (value.__lookupGetter__(key)) {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Getter/Setter]', 'special');
          } else {
            str = stylize('[Getter]', 'special');
          }
        } else {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Setter]', 'special');
          }
        }
      }
      if (visible_keys.indexOf(key) < 0) {
        name = '[' + key + ']';
      }
      if (!str) {
        if (seen.indexOf(value[key]) < 0) {
          if (recurseTimes === null) {
            str = format(value[key]);
          } else {
            str = format(value[key], recurseTimes - 1);
          }
          if (str.indexOf('\n') > -1) {
            if (isArray(value)) {
              str = str.split('\n').map(function(line) {
                return '  ' + line;
              }).join('\n').substr(2);
            } else {
              str = '\n' + str.split('\n').map(function(line) {
                return '   ' + line;
              }).join('\n');
            }
          }
        } else {
          str = stylize('[Circular]', 'special');
        }
      }
      if (typeof name === 'undefined') {
        if (type === 'Array' && key.match(/^\d+$/)) {
          return str;
        }
        name = JSON.stringify('' + key);
        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
          name = name.substr(1, name.length - 2);
          name = stylize(name, 'name');
        } else {
          name = name.replace(/'/g, "\\'")
                     .replace(/\\"/g, '"')
                     .replace(/(^"|"$)/g, "'");
          name = stylize(name, 'string');
        }
      }

      return name + ': ' + str;
    });

    seen.pop();

    var numLinesEst = 0;
    var length = output.reduce(function(prev, cur) {
      numLinesEst++;
      if (cur.indexOf('\n') >= 0) numLinesEst++;
      return prev + cur.length + 1;
    }, 0);

    if (length > (/*require('readline').columns ||*/ 50)) {
      output = braces[0] +
               (base === '' ? '' : base + '\n ') +
               ' ' +
               output.join(',\n  ') +
               ' ' +
               braces[1];

    } else {
      output = braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
    }

    return output;
  }
  return format(obj, (typeof depth === 'undefined' ? 2 : depth));
};


function isArray(ar) {
  return ar instanceof Array ||
         Array.isArray(ar) ||
         (ar && ar !== Object.prototype && isArray(ar.prototype));
}


function isRegExp(re) {
  var s = '' + re;
  return re instanceof RegExp || // easy case
         // duck-type for context-switching evalcx case
         typeof(re) === 'function' &&
         re.constructor.name === 'RegExp' &&
         re.compile &&
         re.test &&
         re.exec &&
         s.match(/^\/.*\/[gim]{0,3}$/);
}


function isDate(d) {
  if (d instanceof Date) return true;
  if (typeof d !== 'object') return false;
  var properties = Date.prototype && Object.getOwnPropertyNames(Date.prototype);
  var proto = d.__proto__ && Object.getOwnPropertyNames(d.__proto__);
  return JSON.stringify(proto) === JSON.stringify(properties);
}
});
_require.define("runtime/runtime_move","runtime/runtime_move.mv",function(require, module, exports, __filename, __dirname){(function(){"use strict";
  var M, _MoveKWArgsT, Text, extend, create, print, repeat, after, JSON, __class, EventEmitter, IS_KNOWN_ES5_HOST, defineConstant, extend, create, repeat, after, _JSON;
  M = Move.runtime, _MoveKWArgsT = M._MoveKWArgsT, Text = M.Text, extend = M.extend, create = M.create, print = M.print, repeat = M.repeat, after = M.after, JSON = M.JSON, __class = M.__class, EventEmitter = M.EventEmitter;
  _MoveKWArgsT = global.Move.runtime._MoveKWArgsT;
  IS_KNOWN_ES5_HOST = !!(typeof process !== "undefined" && (typeof process.versions === "object" && process.versions.node || process.pid));
  if (!IS_KNOWN_ES5_HOST) {
    require("./es5_object");
    require("./es5_array");
    require("./es5_date");
    require("./es5_json");
  }
  require("./runtime_object");
  require("./runtime_string");
  require("./runtime_date");
  require("./runtime_array");
  if (Object.defineProperty) {
    defineConstant = function defineConstant(obj, name, value) {
      obj !== null && typeof obj === "object" && obj.__kw === _MoveKWArgsT && (arguments.keywords = obj, value = obj.value, name = obj.name, obj = obj.obj);
      return Object.defineProperty(obj, name, {
        value: value,
        writable: false,
        enumerable: true,
        configurable: false
      });
    };
  } else {
    defineConstant = function defineConstant(obj, name, value) {
      obj !== null && typeof obj === "object" && obj.__kw === _MoveKWArgsT && (arguments.keywords = obj, value = obj.value, name = obj.name, obj = obj.obj);
      return obj[name] = value;
    };
  }
  defineConstant(exports, "_MoveKWArgsT", _MoveKWArgsT);
  defineConstant(exports, "Text", String);
  String.prototype.toText = String.prototype.toString;
  exports.extend = extend = function extend(object, body, onlyOwnProperties) {
    object !== null && typeof object === "object" && object.__kw === _MoveKWArgsT && (arguments.keywords = object, onlyOwnProperties = object.onlyOwnProperties, body = object.body, object = object.object);
    var T;
    T = body === null ? "undefined" : typeof body;
    if (T === "object" || T === "function") {
      Object.prototype.forEach.call(body, function (key, value) {
        key !== null && typeof key === "object" && key.__kw === _MoveKWArgsT && (arguments.keywords = key, value = key.value, key = key.key);
        if (value !== undefined && value !== _MoveKWArgsT) return object[key] = value;
      }, null, onlyOwnProperties);
    } else if (T !== "undefined") {
      throw new TypeError('"body" argument must be either an object or a function, not a ' + T);
    }
    return object;
  };
  exports.create = create = function create(prototype, body) {
    prototype !== null && typeof prototype === "object" && prototype.__kw === _MoveKWArgsT && (arguments.keywords = prototype, body = prototype.body, prototype = prototype.prototype);
    return extend(Object.create(prototype), body);
  };
  if (typeof Object.inspect !== "function") {
    try {
      Object.inspect = require("util").inspect;
      if (typeof Object.inspect !== "function") throw 1;
    } catch (e) {
      Object.inspect = require("./runtime_inspect").inspect;
    }
  }
  if (typeof console !== "undefined" && console.log) {
    if (typeof window !== "undefined") {
      exports.print = function print() {
        return console.log.apply(console, Array.prototype.slice.call(arguments));
      };
    } else {
      exports.print = console.log;
    }
  } else {
    exports.print = function print() {};
  }
  exports.dprinter = function dprinter(module) {
    module !== null && typeof module === "object" && module.__kw === _MoveKWArgsT && (arguments.keywords = module, module = module.module);
    return function () {
      return exports.print.apply(null, [ "[" + module.id + "]" ].concat(Array.prototype.slice.call(arguments)));
    };
  };
  exports.repeat = repeat = function repeat(times, every, block) {
    times !== null && typeof times === "object" && times.__kw === _MoveKWArgsT && (arguments.keywords = times, block = times.block, every = times.every, times = times.times);
    var i, timer;
    if (typeof times === "function") {
      while (true) if (!times()) break;
      return;
    }
    if (typeof block === "function") {
      if (times !== undefined) {
        for (i = 0; i < times; ++i) if (block(i) === true) break;
      } else if (every !== undefined) {
        timer = Object.create({}, {
          cancel: {
            value: function () {
              return clearInterval(this.id);
            }
          }
        });
        timer.id = setInterval(function () {
          return block(timer);
        }, every);
        return timer;
      } else {
        while (true) if (!block()) break;
      }
    } else {
      return function (block) {
        block !== null && typeof block === "object" && block.__kw === _MoveKWArgsT && (arguments.keywords = block, block = block.block);
        if (times !== undefined) {
          for (i = 0; i < times; ++i) if (block(i) === true) break;
        } else if (every !== undefined) {
          timer = Object.create({}, {
            cancel: {
              value: function () {
                return clearInterval(this.id);
              }
            }
          });
          timer.id = setInterval(function () {
            return block(timer);
          }, every);
          return timer;
        } else {
          while (true) if (!block()) break;
        }
      };
    }
  };
  exports.after = after = function after(delay, date, target) {
    delay !== null && typeof delay === "object" && delay.__kw === _MoveKWArgsT && (arguments.keywords = delay, target = delay.target, date = delay.date, delay = delay.delay);
    if (delay) {
      if (typeof delay !== "number") throw new TypeError('"delay" argument must be a number');
    } else if (date) {
      if (typeof date === "string" || typeof date === "number") {
        date = new Date(date);
        if (isNaN(date.getTime())) throw new Error('Invalid date/time passed for "date" argument');
      } else if (typeof date !== "object" || !(date instanceof Date)) {
        throw new TypeError('"date" argument must be a Date object or a string');
      }
      delay = Math.max(0, date.getTime() - (new Date).getTime());
    }
    return function (block) {
      block !== null && typeof block === "object" && block.__kw === _MoveKWArgsT && (arguments.keywords = block, block = block.block);
      var b;
      if (target) {
        b = function b() {
          return block.apply(target, arguments);
        };
      } else {
        b = block;
      }
      return setTimeout(b, delay);
    };
  };
  JSON = global.JSON;
  _JSON = function _JSON(build, parse) {
    build !== null && typeof build === "object" && build.__kw === _MoveKWArgsT && (arguments.keywords = build, parse = build.parse, build = build.build);
    if (build !== undefined || parse === undefined) return JSON.stringify(build); else return JSON.parse(parse);
  };
  _JSON.parse = JSON.parse;
  _JSON.stringify = JSON.stringify;
  exports.JSON = _JSON;
  global.Move.runtime = exports;
  exports.__class = require("./runtime_class").__class;
  return exports.EventEmitter = require("./runtime_events").EventEmitter;
})();});
_require.define("runtime/runtime_object","runtime/runtime_object.js",function(require, module, exports, __filename, __dirname){if (!Object.prototype.forEach) {
  var forEach = function forEach(block, ctx, onlyOwnProperties) {
    if (!ctx || (typeof ctx !== 'object' && typeof ctx !== 'function'))
      ctx = this;
    if (typeof block !== 'function')
      throw new TypeError('First argument is not a function');
    var obj = this, key;
    if (onlyOwnProperties) {
      Object.keys(this).forEach(function (key) {
        block.call(ctx, key, obj[key], obj);
      });
    } else {
      for (key in this) block.call(ctx, key, obj[key], obj);
    }
    return this;
  };
  if (Object.defineProperty) {
    Object.defineProperty(Object.prototype, 'forEach', {value:forEach});
  } else {
    // not good -- might break old for (key in object) iterations.
    // It's better not to include this feature than to break things.
    //Object.prototype.forEach = forEach;
  }
}
});
_require.define("runtime/runtime_string","runtime/runtime_string.js",function(require, module, exports, __filename, __dirname){if (!String.prototype.repeat)
String.prototype.repeat = function repeat(times) {
  s = ''; while (times--) s += this
  return s;
};

if (!String.prototype.padLeft)
String.prototype.padLeft = function padLeft(length, padstr) {
  if (this.length >= length) return this;
  return String(padstr || " ").repeat(length-this.length) + this;
};

if (!String.prototype.padRight)
String.prototype.padRight = function padRight(length, padstr) {
  if (this.length >= length) return this;
  return this + String(padstr || " ").repeat(length-this.length);
};

// Levenshtein edit distance by Carlos R. L. Rodrigues
if (!String.prototype.editDistance)
String.prototype.editDistance = function editDistance(otherString) {
  var s, l = (s = this.split("")).length,
      t = (otherString = otherString.split("")).length, i, j, m, n;
  if(!(l || t)) return Math.max(l, t);
  for(var a = [], i = l + 1; i; a[--i] = [i]);
  for(i = t + 1; a[0][--i] = i;);
  for(i = -1, m = s.length; ++i < m;) {
    for(j = -1, n = otherString.length; ++j < n;) {
      a[(i *= 1) + 1][(j *= 1) + 1] = Math.min(a[i][j + 1] + 1,
        a[i + 1][j] + 1, a[i][j] + (s[i] != otherString[j]));
    }
  }
  return a[l][t];
};

// Return all parts of the receiver which matches regexp `pattern`
if (!String.prototype.matchAll)
String.prototype.matchAll = function matchAll(pattern) {
  "use strict";
  if (!(pattern instanceof RegExp)) {
    pattern = new RegExp(pattern, 'g');
  } else if (!pattern.global) {
    pattern = new RegExp(pattern.source, 'g');
  }
  var match, matches = [];
  while (match = pattern.exec(this)) {
    matches.push(match);
  }
  return matches;
};

// Iterate over the receiver for matches of regexp `pattern`
if (!String.prototype.forEachMatch)
String.prototype.forEachMatch = function forEachMatch(pattern, iterfun, thisObject) {
  "use strict";
  if (!thisObject) thisObject = this;
  this.matchAll(pattern).forEach(iterfun, thisObject);
  return thisObject;
};

// Use locale-aware case conversion if available
if (typeof String.prototype.toLocaleLowerCase === 'function')
  String.prototype.toLowerCase = String.prototype.toLocaleLowerCase;
if (typeof String.prototype.toLocaleUpperCase === 'function')
  String.prototype.toUpperCase = String.prototype.toLocaleUpperCase;
});
_require.define("runtime/symbols","runtime/symbols.js",function(require, module, exports, __filename, __dirname){// _MoveKWArgsT represents keyword arguments and is used for detection
exports._MoveKWArgsT = function _MoveKWArgsT(obj) {
  obj.__kw = _MoveKWArgsT;
  return obj;
};});


_require('runtime');
var move = global.Move;

// --------------------------------------------------------------
move.version = function () { return "0.4.4"; };

// --------------------------------------------------------------
move.require = Require();



return move;
})();