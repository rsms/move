exports.array_to_hash = function(a) {
  var ret = {};
  for (var i = 0; i < a.length; ++i)
    ret[a[i]] = true;
  return ret;
};

// takes a list of space-separated words
exports.words_to_hash = function(words) {
  return array_to_hash(words.split(' '));
}

// takes a string and returns a set of character codes
exports.string_to_charset = function(str) {
  return array_to_hash(str.split('').map(function(ch) {
    return ch.charCodeAt(0); }));
}

// test if a character (charcode) is any of [a-z A-Z 0-9]
exports.is_alphanumeric_char = function(c) {
  return (c >= 48 && c <= 57)
      || (c >= 65 && c <= 90)
      || (c >= 97 && c <= 122);
};

// test if a character (charcode) is a digit [0-9]
exports.is_digit_char = function(c) {
  return c >= 48 && c <= 57;
};

// test if |prop| is a direct "own" property of |obj|
exports.HOP = function(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
};

// test for substring equality (w/o making a temporary copy of subject)
exports.is_substr_eq = function(subject, offset, substr) {
  var i = substr.length;
  while (--i !== -1) {
    if (subject.charCodeAt(offset+i) !== substr.charCodeAt(i))
      return false;
  }
  return true;
}
