if (!Object.prototype.forEach) {
  var forEach = function forEach(block, ctx) {
    if (ctx !== null && typeof ctx !== 'object') ctx = this;
    var obj = this;
    Object.keys(this).forEach(function (key) {
      block.call(ctx, key, obj[key], obj);
    });
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
