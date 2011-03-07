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

if (typeof Array.prototype._move_slice !== 'function')
Array.prototype._move_slice = function(startIndex, endIndex) {
    // console.log("start", startIndex, "end", endIndex)
    startIndex = Math.max(0, startIndex)        
    return this.slice(startIndex, endIndex);
};

// list[startIndex:endIndex] = value -> list
// _move_setSlice(startIndex, endIndex=@length, value) -> list
if (typeof Array.prototype._move_setSlice != 'function') {
  var _splice = Array.prototype.splice;
  Array.prototype._move_setSlice =
  function _move_setSlice(startIndex, endIndex, value) {
    // splice(index, howMany[, element1[, ...[, elementN]]]) → list
    var length;
    startIndex = Math.max(0, startIndex)
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
