if (!Object.prototype.forEach)
Object.prototype.forEach = function forEach(block, ctx) {
  if (ctx !== null && typeof ctx !== 'object') ctx = this;
  var obj = this;
  Object.keys(this).forEach(function (key) {
    block.call(ctx, key, obj[key], obj);
  });
  return this;
};
