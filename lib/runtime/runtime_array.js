// unique() -> list
if (typeof Array.prototype.unique !== 'function')
Object.defineConstant(Array.prototype, 'unique', function unique() {
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
});

// list[startIndex:endIndex] = value -> list
// _move_setSlice(startIndex, endIndex=@length, value) -> list
if (typeof Array.prototype._move_setSlice != 'function') {
  var _splice = Array.prototype.splice;
  Object.defineConstant(Array.prototype, '_move_setSlice',
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
    }
  );
}
