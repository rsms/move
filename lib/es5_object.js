var slice = Array.prototype.slice.call;

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

