// _MoveKWArgsT represents keyword arguments and is used for detection
exports._MoveKWArgsT = function _MoveKWArgsT(obj) {
  obj.__kw = _MoveKWArgsT;
  return obj;
};