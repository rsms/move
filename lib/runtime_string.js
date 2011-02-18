if (!String.prototype.repeat)
String.prototype.repeat = function repeat(times) {
  s = ''; while (times--) s += this
  return s;
};

if (!String.prototype.padLeft)
String.prototype.padLeft = function padLeft(length, padstr) {
  if (this.length >= length) return this;
  return String(padstr || " ").repeat(length-this.length) + this;
};

if (!String.prototype.padRight)
String.prototype.padRight = function padRight(length, padstr) {
  if (this.length >= length) return this;
  return this + String(padstr || " ").repeat(length-this.length);
};

// Levenshtein edit distance by Carlos R. L. Rodrigues
if (!String.prototype.editDistance)
String.prototype.editDistance = function editDistance(otherString) {
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
};
