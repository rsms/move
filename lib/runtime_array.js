// unique() -> list
if (typeof Array.prototype.unique !== 'function')
Array.prototype.unique = function unique() {
  a = [], l = this.length;
  for (i=0; i<l; ++i) {
    for (j=i+1; j<l; ++j)
      if (this[i] === this[j]) j = ++i;
    a.push(this[i]);
  }
  return a;
};

if (typeof Array.prototype._move_slice !== 'function') {
    Array.prototype._move_slice = function _move_slice(startIndex, endIndex) {
        // console.log("start", startIndex, "end", endIndex)
        if(startIndex < 0) {
            startIndex = this.length - (-startIndex);
        }
        return this.slice(startIndex, endIndex);
    };
}

// list[startIndex:endIndex] = value -> list
// _move_setSlice(startIndex, endIndex=@length, value) -> list
if (typeof Array.prototype._move_setSlice != 'function') {
  var _splice = Array.prototype.splice;
  Array.prototype._move_setSlice =
  function _move_setSlice(startIndex, endIndex, value) {
    // splice(index, howMany[, element1[, ...[, elementN]]]) → list
    var length = this.length;
    if(startIndex < 0) {
        startIndex =  length - (-startIndex);
    }
    if (endIndex !== undefined) {
      if (typeof endIndex !== 'number')
        throw new TypeError('Second argument must be a number');
      length = endIndex - startIndex;
    } 
    return _splice.apply(this, [startIndex, length].concat(value));
  };
}
