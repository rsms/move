if (!String.prototype.repeat)
Object.defineConstant(String.prototype, 'repeat', function repeat(times) {
  s = ''; while (times--) s += this
  return s;
});

if (!String.prototype.padLeft)
Object.defineConstant(String.prototype, 'padLeft', function padLeft(length, padstr) {
  if (this.length >= length) return this;
  return String(padstr || " ").repeat(length-this.length) + this;
});

if (!String.prototype.padRight)
Object.defineConstant(String.prototype, 'padRight', function padRight(length, padstr) {
  if (this.length >= length) return this;
  return this + String(padstr || " ").repeat(length-this.length);
});

// Levenshtein edit distance by Carlos R. L. Rodrigues
if (!String.prototype.editDistance)
Object.defineConstant(String.prototype, 'editDistance', function editDistance(otherString) {
  var s, l = (s = this.split("")).length,
      t = (otherString = otherString.split("")).length, i, j, m, n;
  if(!(l || t)) return Math.max(l, t);
  for(var a = [], i = l + 1; i; a[--i] = [i]);
  for(i = t + 1; a[0][--i] = i;);
  for(i = -1, m = s.length; ++i < m;) {
    for(j = -1, n = otherString.length; ++j < n;) {
      a[(i *= 1) + 1][(j *= 1) + 1] = Math.min(a[i][j + 1] + 1,
        a[i + 1][j] + 1, a[i][j] + (s[i] != otherString[j]));
    }
  }
  return a[l][t];
});

// Return all parts of the receiver which matches regexp `pattern`
if (!String.prototype.matchAll)
Object.defineConstant(String.prototype, 'matchAll', function matchAll(pattern) {
  "use strict";
  if (!(pattern instanceof RegExp)) {
    pattern = new RegExp(pattern, 'g');
  } else if (!pattern.global) {
    pattern = new RegExp(pattern.source, 'g');
  }
  var match, matches = [];
  while (match = pattern.exec(this)) {
    matches.push(match);
  }
  return matches;
});

// Iterate over the receiver for matches of regexp `pattern`
if (!String.prototype.forEachMatch)
Object.defineConstant(String.prototype, 'forEachMatch',
  function forEachMatch(pattern, iterfun, thisObject) {
    "use strict";
    if (!thisObject) thisObject = this;
    this.matchAll(pattern).forEach(iterfun, thisObject);
    return thisObject;
  }
);

// Use locale-aware case conversion if available
if (typeof String.prototype.toLocaleLowerCase === 'function')
  Object.defineConstant(String.prototype, 'toLowerCase', String.prototype.toLocaleLowerCase);
if (typeof String.prototype.toLocaleUpperCase === 'function')
  Object.defineConstant(String.prototype, 'toUpperCase', String.prototype.toLocaleUpperCase);
