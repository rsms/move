// CommonJS compatible module loading.
// (Except from require.paths, it's compliant with spec 1.1.1.)
var Require = function Require(parentExports) {
  // normalize an array of path components
  function normalizeArray (v, keepBlanks) {
    var L = v.length, dst = new Array(L), dsti = 0,
        i = 0, part, negatives = 0,
        isRelative = (L && v[0] !== '');
    for (; i<L; ++i) {
      part = v[i];
      if (part === '..') {
        if (dsti > 1) {
          --dsti;
        } else if (isRelative) {
          ++negatives;
        } else {
          dst[0] = '';
        }
      } else if (part !== '.' && (dsti === 0 || keepBlanks || part !== '')) {
        dst[dsti++] = part;
      }
    }
    if (negatives) {
      dst[--negatives] = dst[dsti-1];
      dsti = negatives + 1;
      while (negatives--) { dst[negatives] = '..'; }
    }
    dst.length = dsti;
    return dst;
  }
  // normalize an id
  function normalizeId(id, parentId) {
    id = id.replace(/\/+$/g, '');
    return normalizeArray((parentId ? parentId + '/../' + id : id).split('/'))
           .join('/');
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
  function require (id, parentId) {
    var originalInputId = id; // for "not found" error message
    if (id.charAt(0) === '.') {
      id = normalizeId(id, parentId);
    }
    if (!require.modules.hasOwnProperty(id)) {
      throw new Error('module not found '+JSON.stringify(originalInputId));
    }
    var mod = require.modules[id];
    if (mod.exports === undefined) {
      var _require = function (_id) {
        //console.log('_require', _id, 'from', id);
        return require(_id, id);
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