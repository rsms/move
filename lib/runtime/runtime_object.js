if (!Object.prototype.forEach) {
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

if (!Object.defineConstant)
Object.defineConstant = Object.defineProperty ?
  function defineConstant(obj, prop, value, enumerable/*=false*/) {
    return Object.defineProperty(obj, prop, {
      enumerable: !!enumerable,
      configurable: false,
      writable: false,
      value: value
    });
  } :
  function defineConstant(obj, prop, value) { obj[prop] = value; };
