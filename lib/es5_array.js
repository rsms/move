if (!Array.isArray)
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
