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