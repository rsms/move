if (!String.prototype.trim)
String.prototype.trim = function trim() {
  return this.replace(/^(?:\s|\u00A0)+/, '').replace(/(?:\s|\u00A0)+$/, '');
};

if (!String.prototype.trimLeft)
String.prototype.trimLeft = function trimLeft() {
  return this.replace(/^(?:\s|\u00A0)+/, '');
};

if (!String.prototype.trimRight)
String.prototype.trimRight = function trimRight() {
  return this.replace(/(?:\s|\u00A0)+$/, '');
};
