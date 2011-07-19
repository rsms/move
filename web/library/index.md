---
layout: page
title: Library
---

# Move standard library

Built-in objects and functions


## Number

- `literal → number` — Numbers are created using literal numbers like `123.4` or `0xf4`. Refer to the [language reference on numbers](#types/number) for details.

- `Number(value) → number` — Convert a value to a number. Returns the `NaN` atom if the conversion failed.

- `Number.MAX_VALUE → number` — The largest positive representable number. The largest negative representable number is `-MAX_VALUE`. Read-only.

- `Number.MIN_VALUE → number` — The smallest positive representable number — that is, the positive number closest to zero (without actually being zero). The smallest negative representable number is `-MIN_VALUE`. Read-only.

- `Number.NaN → NaN` — Special "not a number" value. Read-only.

- `Number.NEGATIVE_INFINITY → number` — Special value representing negative infinity; returned on overflow. Read-only.

- `Number.POSITIVE_INFINITY → number` — Special value representing infinity; returned on overflow.


### Number.prototype

- `toExponential(fractionDigits) → text` — Returns text representing the number in exponential notation. `fractionDigits` defaults to as many digits as necessary to specify the number.

- `toFixed(digits:0) → text` — Returns text representing the number in fixed-point notation.

- `toPrecision(precision) → text` — Returns text representing the number to a specified precision in fixed-point or exponential notation. If `precision` is not given, this function produce the same result as the [`toText`](#Object.prototype) function.




## Object

- `{key1: value1, key2: value2, ..., keyN: valueN} → object` — Creates a new object with zero or more value properties.

- `Object.create(prototype, properties) → object` — Creates a new object whose prototype is the passed in parent object `prototype` and whose properties are those specified by `properties`. See also: [`create`](#create).

- `Object.keys(obj) → [text, ...]` — Returns a list of the ownProperties of an object that are enumerable.

- `Object.defineProperty(obj, prop, desc)` — Defines a property on an object with the given descriptor

- `Object.defineProperties(obj, props)` — Adds own properties and/or updates the attributes of existing own properties of an object

- `Object.getOwnPropertyNames(obj) → [text, ...]` — Returns a list of the ownProperties of an object including ones that are not enumerable.

- `Object.getPrototypeOf(obj) → object` — Returns the prototype of an object.

- `Object.getOwnPropertyDescriptor(obj, property) → object` — Returns an object with keys describing the description of a property (value, writable, enumerable, configurable)

- `Object.preventExtensions(obj)` — Prevents any new properties from being added to the given object.

- `Object.isExtensible(obj) → true|false` — Checks if Object.preventExtensions() has been called on this object.

- `Object.seal(obj)` — Prevents code from adding or deleting properties, or changing the descriptors of any property on an object. Property values can be changed however.

- `Object.isSealed(obj) → true|false` — Checks if Object.seal() has been called on this object.

- `Object.freeze(obj)` — Same as Object.seal, except property values cannot be changed.

- `Object.isFrozen(obj) → true|false` — Checks if Object.freeze() has been called on this object.

- `Object.inspect(value, showHidden:false, depth:2) → text` — Returns a human-readable representation of the *value* including its properties (if *showHidden* is false, only "enumerable" properties are displayed, otherwise all properties are displayed).


### Object.prototype

- `.name ←→ value` — Access or modify the value for property named *name*.

- `[text] ←→ value` — Access or modify the value for property named *text*.

- `constructor ←→ function` — Specifies the function that creates an object's prototype.

- `toText() → text` — Text representation of the object.

- `valueOf() → object` — Returns the primitive value of the object.

- `hasOwnProperty(name) → true|false` — Returns a boolean indicating whether an object contains the specified property as a direct property of that object and not inherited through the prototype chain.

- `isPrototypeOf(value) → true|false` — Returns a boolean indication whether the specified object is in the prototype chain of the object this method is called upon.

- `forEach(^(key, value, sourceObj), thisObject:null)` — Calls a function for each key-value pair owned by the object. *Non-standard, Move-specific*.


## Array

- `[value1, value2, ..., valueN] → list` — Creates a list holding zero or more values.

- `Array(length:0) → list` — Creates a list with a certain initial length. Not specifying a length is equivalent to using the list literal "`[]`".

- `Array.isArray(value) → true|false` — Test if a value is a list or not.


### Array.prototype

- `length ←→ number` — Number of items in the list.

- `[number] ←→ value` — Access or modify the value at a specific index.

- `concat(list2, list3, ..., listN) → list` — Returns a new array comprised of this array joined with other array(s) and/or value(s).

- `every(^(value, index, o) → true|false, this:this) → true|false` — Returns true if every element in this array satisfies the provided testing function.

- `filter(^(value, index, o) → true|false, this:this) → list` — Creates a new array with all of the elements of this array for which the provided filtering function returns true.

- `forEach(^(value, index, sourceObj), thisObject:null)` — Calls a function for each element in the array.

- `indexOf(value, startIndex:0) → number` — Returns the first (least) index of an element within the array equal to the specified value, or -1 if none is found.

- `lastIndexOf(value, startIndex:@length-1) → number` — Returns the last (greatest) index of an element within the array equal to the specified value, or -1 if none is found.

- `join(glueText:"") → text` — Joins all elements of an array into text.

- `map(^(value, index, o) → value, this:this) → list` — Creates a new array with the results of calling a provided function on every element in this array.

- `push(value1, ..., value1) → number` — Adds one or more elements to the end of an array and returns the new length of the array.

- `unshift(value1, ..., value1) → number` — Adds one or more elements to the front of an array and returns the new length of the array.

- `pop() → value` — Removes the last element from an array and returns that element.

- `shift() → value` — Removes the first element from an array and returns that element.

- `reduce(^(previousValue, currentValue, index, o) → value, initialValue:undefined) → value` — Apply a function simultaneously against two values of the array (from left-to-right) as to reduce it to a single value.

- `reduceRight(^(previousValue, currentValue, index, o) → value, initialValue:undefined) → value` — Apply a function simultaneously against two values of the array (from right-to-left) as to reduce it to a single value.

- `reverse() → list` — Reverses the order of the elements of an array — the first becomes the last, and the last becomes the first. This function does not create a new list, but modifies the calling list in place.

- `slice(startIndex, endIndex:@length) → ` — Extracts a section of an array and returns a new array.

- `some(^(value, index, o) → true|false) → true|false` — Returns true if at least one element in this array satisfies the provided testing function.

- `sort(^(value1, value2) → number:undefined) → list` — Sorts the elements of an array. This function does not create a new list, but modifies the calling list in place.

- `splice(index, howMany[, element1[, ...[, elementN]]]) → list` — Adds and/or removes elements from an array. Returns the caller.

- `unique() → list` — Returns a new list with duplicate values removed. The order of values are not retained.




## Text

*Text* is an alias for the JavaScript built-in type `String` and is the object prototype used for text values. The use of `Text` in favor for `String` is recommended but not enforced.

- `"literal"|'literal' → text` — Text is created by wrapping literal text in either double or single quote characters.

- `Text(value) → text` — Text representation of `value`

- `Text.fromCharCode(number) → text` — Text of character representing a Unicode character code.


### Text.prototype

- `length → number` — Number of characters.

- `charAt(number) → text` — Returns the character at the specified index.

- `[number] → text` — Text representing the character at position `number`.

- `charCodeAt(number) → number` — Returns a number indicating the Unicode value of the character at the given index.

- `concat(string2, string3, ..., stringN]) → text` — Combines the text of two strings and returns a new string. Same as `string + string2 + string3 + ... stringN`.

- `indexOf(needle, startIndex:0) → number` — Returns the index within the calling String object of the first occurrence of the specified value, or -1 if not found.

- `lastIndexOf(needle, startIndex:@length-1) → number` — Returns the index within the calling String object of the last occurrence of the specified value, or -1 if not found.

- `localeCompare(other) → number` — Returns a number indicating whether a reference string comes before or after or is the same as the given string in sort order.

- `match(regexp) → object` — Used to match a regular expression against a string.

- `replace(text|regexp, replacement|function) → text` — Used to find a match between a regular expression and a string, and to replace the matched substring with a new substring.

- `search(regexp) → number` — Executes the search for a match between a regular expression and a specified string. Returns the index of the regular expression inside the string. Faster than `match` but returns less information.

- `slice(startIndex, endIndex:@length) → text` — Extracts a section of a string and returns a new string.

- `split(text|regexp, limit:Number.POSITIVE\_INFINITY) → [text, text, ...]` — Splits text into a list of texts by separating the text into smaller chunks.

- `substr(startIndex, length:@length-1) → text` — Returns the characters beginning at the specified location through the specified number of characters.

- `substring(startIndex, endIndex:@length) → text` — Returns the characters in a string between two indexes in the text.

- `toLowerCase() → text` — Returns a version of the text converted to lower case.

- `toUpperCase() → text` — Returns a version of the text converted to upper case.

- `trim() → text` — Trims whitespace from both ends of the string

- `trimRight() → text` — Trims whitespace from the right side of the string

- `trimLeft() → text` — Trims whitespace from the left side of the string

- `repeat(times) → text` — Returns a new text which is the result of pasting together *times* copies of the calling text.

- `padLeft(length, padding:" ") → text` — Returns a new text which has at least *length* number of characters. If the calling text have less characters than *length*, *padding* is used to fill out the beginning of the text.

- `padRight(length, padding:" ") → text` — Returns a new text which has at least *length* number of characters. If the calling text have less characters than *length*, *padding* is used to fill out the end of the text.

- `editDistance(text) → number` — Difference of the calling text versus *text* measured in number of edits needed to transform the caller into the *text* argument. (e.g. `"SnataMArIa".editDistance("Santa Maria") → 5` because five edits are needed to transform "SnataMArIa" into "Santa Maria")

- `matchAll(pattern) → list` — Returns a list of matches for *pattern* (a RegExp) in the receiver. Each match object contains the matched groups accessible by group number as well as the following properties:
  - `index ←→ number` — The 0-based offset of the match in the text.
  - `input ←→ text` — The original input text.

- `forEachMatch(pattern, ^(match, index, matches), thisObject:null)` — Iterates over all parts of the receiver matching *pattern* (a RegExp). Each match object contains the matched groups accessible by group number as well as the following properties:
  - `index ←→ number` — The 0-based offset of the match in the text.
  - `input ←→ text` — The original input text.


## Function

- `^(arg1[:val1], arg2[:val2], ..., argN[:valN]) { body } → function` — Create a function with zero or more arguments where "body" is substituted for the function's code block.

### Function.prototype

- `apply(this, arguments:[]) → value` — Applies the function in the context (the "this" value) of a different object. Arguments can be passed as an Array object.

- `call(this, argument1, argument2, ..., argumentN) → value` — Applies the function in the context (the "this" value) of a different object. Arguments can be passed as a succession of extra arguments.

Example:
<samp>undefined
John</samp>

    foo = ^{ print @name }
    foo {}
    foo.call {name: "John"}


## Date

- `Date(year:0, month:0, day:0, hours:0, minutes:0, seconds:0, milliseconds:0) → text` — Date and time as text in a locale-specific format

- `new Date → date` — Current date and time as a date object

- `new Date(milliseconds) → date` — Create a date object representing the time and day at the *milliseconds* timestamp (UNIX epoch).

- `new Date(year, month, day, hours:0, minutes:0, seconds:0, milliseconds:0) → date` — Create a date object by specifying its components as numbers.

- `new Date(text) → date` — Create a date object by parsing text as date and/or time.

- `Date.parse(text) → date` — Create a date object by parsing text as date and/or time.

- `Date.distantFuture → date` — A date in the distant future

- `Date.distantPast → date` — A date in the distant past

- `Date.now() → number` — Returns the number of milliseconds since January 1, 1970, 00:00:00, local time.

- `Date.nowUTC() → number` — Returns the number of milliseconds since January 1, 1970, 00:00:00, universal time.

- `Date.UTC(year, month, day:0, hours:0, minutes:0, seconds:0, milliseconds:0) → number` — Returns the number of milliseconds for the date represented by the arguments, since January 1, 1970, 00:00:00, universal time.


### Date.prototype

- `getDate() → number` — Returns the day of the month (1-31) for the specified date according to local time.
- `getDay() → number` — Returns the day of the week (0-6) for the specified date according to local time.
- `getFullYear() → number` — Returns the year (4 digits for 4-digit years) of the specified date according to local time.
- `getHours() → number` — Returns the hour (0-23) in the specified date according to local time.
- `getMilliseconds() → number` — Returns the milliseconds (0-999) in the specified date according to local time.
- `getMinutes() → number` — Returns the minutes (0-59) in the specified date according to local time.
- `getMonth() → number` — Returns the month (0-11) in the specified date according to local time.
- `getSeconds() → number` — Returns the seconds (0-59) in the specified date according to local time.
- `getTime() → number` — Returns the numeric value of the specified date as the number of milliseconds since January 1, 1970, 00:00:00 UTC (negative for prior times).
- `getTimezoneOffset() → number` — Returns the time-zone offset in minutes for the current locale.
- `getUTCDate() → number` — Returns the day (date) of the month (1-31) in the specified date according to universal time.
- `getUTCDay() → number` — Returns the day of the week (0-6) in the specified date according to universal time.
- `getUTCFullYear() → number` — Returns the year (4 digits for 4-digit years) in the specified date according to universal time.
- `getUTCHours() → number` — Returns the hours (0-23) in the specified date according to universal time.
- `getUTCMilliseconds() → number` — Returns the milliseconds (0-999) in the specified date according to universal time.
- `getUTCMinutes() → number` — Returns the minutes (0-59) in the specified date according to universal time.
- `getUTCMonth() → number` — Returns the month (0-11) in the specified date according to universal time.
- `getUTCSeconds() → number` — Returns the seconds (0-59) in the specified date according to universal time.
- `getUTCTime() → number` — Returns the numeric value of the specified date as the number of milliseconds since January 1, 1970, 00:00:00 UTC (negative for prior times), universal time.
- `getUTCComponents() → list` — Date and time components (numbers) in Universal Time Coordinate. *list* contains:
  - `[0] ←→ year` — Full (Gregorian) year (i.e. year 2011 is represented by the number 2011)
  - `[1] ←→ month` — 1-based month number (i.e. March is represented by the number 3)
  - `[2] ←→ day` — 1-based day-of-month (i.e. Jan 4th is represented by the number 4)
  - `[3] ←→ hours` — Hour of the day in the (inclusive) range 0-23
  - `[4] ←→ minutes` — Minutes of the hour in the (inclusive) range 0-59
  - `[5] ←→ seconds` — Seconds of the minute in the (inclusive) range 0-59
  - `[6] ←→ milliseconds` — Milliseconds of the second in the (inclusive) range 0-999
- `setDate(number) → number` — Sets the day of the month (1-31) for a specified date according to local time.
- `setFullYear(number) → number` — Sets the full year (4 digits for 4-digit years) for a specified date according to local time.
- `setHours(number) → number` — Sets the hours (0-23) for a specified date according to local time.
- `setMilliseconds(number) → number` — Sets the milliseconds (0-999) for a specified date according to local time.
- `setMinutes(number) → number` — Sets the minutes (0-59) for a specified date according to local time.
- `setMonth(number) → number` — Sets the month (0-11) for a specified date according to local time.
- `setSeconds(number) → number` — Sets the seconds (0-59) for a specified date according to local time.
- `setTime(number) → number` — Sets the Date object to the time represented by a number of milliseconds since January 1, 1970, 00:00:00 UTC, allowing for negative numbers for times prior.
- `setUTCDate(number) → number` — Sets the day of the month (1-31) for a specified date according to universal time.
- `setUTCFullYear(number) → number` — Sets the full year (4 digits for 4-digit years) for a specified date according to universal time.
- `setUTCHours(number) → number` — Sets the hour (0-23) for a specified date according to universal time.
- `setUTCMilliseconds(number) → number` — Sets the milliseconds (0-999) for a specified date according to universal time.
- `setUTCMinutes(number) → number` — Sets the minutes (0-59) for a specified date according to universal time.
- `setUTCMonth(number) → number` — Sets the month (0-11) for a specified date according to universal time.
- `setUTCSeconds(number) → number` — Sets the seconds (0-59) for a specified date according to universal time.
- `toDateString() → text` — Returns the "date" portion of the Date as a human-readable string.
- `toLocaleDateString() → text` — Returns the "date" portion of the Date as a string, using the current locale's conventions.
- `toLocaleString() → text` — Converts a date to a string, using the current locale's conventions. Overrides the Object.toLocaleString method.
- `toLocaleTimeString() → text` — Returns the "time" portion of the Date as a string, using the current locale's conventions.
- `toTimeString() → text` — Returns the "time" portion of the Date as a human-readable string.
- `toUTCString() → text` — Converts a date to a string, using the universal time convention.




## RegExp

- `/pattern/flags → regexp` — Create a regular expression by compiling `pattern` (unquoted text) with regards to `flags` (unquoted text).

- `RegExp(pattern, flags:"") → regexp` — Create a regular expression object by compiling `pattern` (text) with regards to `flags` which can have any combination of the following values:

  - **g** — global match
  - **i** — ignore case
  - **m** — Treat beginning and end characters (^ and $) as working over
    multiple lines (i.e., match the beginning or end of each line (delimited by
    \n or \r), not only the very beginning or end of the whole input string)

### RegExp.prototype

- `global ←→ true|false` — Whether to test the regular expression against all possible matches in a text, or only against the first.

- `ignoreCase ←→ true|false` — Whether to ignore case while attempting a match.

- `multiline ←→ true|false` — Whether or not to search in text across multiple lines.

- `lastIndex ←→ number` — The index at which to start the next match.

- `source → text` — The text of the pattern.

- `exec(text) → list` — Executes a search for a match in its text parameter. The returned list contains the matched groups as text plus it has the following properties:
  - `index ←→ number` — The 0-based offset of the match in the text.
  - `input ←→ text` — The original input text.

- `test(text) → true|false` — Tests for a match in its text parameter.



## Boolean

- `Boolean(value) → true|false` — Returns the ["true" atom](#types/atom) if *value* is truthy. Otherwise the "false" atom is returned.




## JSON

- `JSON(value) → text`, `JSON{build: value} → text`, `JSON.stringify(value) → text` — Takes any serializable object and returns the [JSON](http://json.org/) representation.

- `JSON{parse: text} → value`, `JSON.parse(text) → value` — Takes well formed [JSON](http://json.org/) source and returns the corresponding value.




## Move

*Move* houses the Move runtime library. All members of *Move* are available directly (i.e. access by "foo" instead of "Move.foo") and need not be "prefixed".

### create

- `create(prototype, body) → object` — Creates a new object whose prototype is the *prototype* object and whose value properties are those specified by the *body* object (e.g. `{key1: value1, key2: value2, ..., keyN: valueN}`). Note that *body* is not a property specification as accepted by [Object.create](#Object), but a regular object literal with keys and values.

- `create(prototype) → object` — Creates a new object whose prototype is the *prototype* object.

- `create(prototype, ^{...}) → object` — Creates a new object whose prototype is the *prototype* object. The second argument (a function) is applied to the newly created object (the "this" variable represents the new object within the function) which can be used to initialize any properties.

Example:
<samp>Cat: I'm furry</samp>

    animal = { type: "an animal",
               toString: ^{ "I'm " + @type } }
    cat = create animal, { type: "furry" }
    print "Cat: " + cat


### extend

- `extend(object, body) → object` — Extend *object* by adding a (shallow) copy of all property values from the *body* object.

- `extend(object, ^{...}) → object` — Extend or manipulate *object* by calling the passed function (second argument) on *object* (the "this" variable will represent *object*)

Example:
<samp>{ bananas: 'yellow',
  lime: 'green',
  oranges: 'orange' }</samp>

    fruit = { bananas: "yellow" }
    extend fruit, { lime: "green", oranges: "orange" }
    print fruit


### print

- `print(value1, value2, ..., valueN)` — Present zero or more values in a visual fashion. How the values are presented is defined by the implementation. By default *print* will send the values to the runtime engine's *console.log* if exists or do nothing.

The *print* function is often overridden in user-specific implementations by simply assigning a custom function, e.g. `Move.print = ^{ ...my print logic... }`.


### repeat

- `repeat{times: number} → ^(^{...})`, `repeat(number) → ^(^{...})` — Returns an "executor" function which when called will call the passed function *number* times. If the passed function returns the *true* atom, repetition is canceled.

- `repeat(number, ^{...})` — Repeatedly call the passed function *number* times or until the passed function returns the *true* atom.

- `repeat{every: number} → ^(^(timer){...}) → timer` — Returns an "executor" function which when called will call the passed function every *number* milliseconds. The returned `timer` object (also passed as the first argument to the block) can be cancelled by calling `timer.cancel()`, effectively stopping repetition. This is a Move-style implementation of `window.setInterval`.

- `repeat(^{...})` — Repeatedly call the passed function until it returns a falsy value (or: repeatedly call the passed function while it returns a truthy value).

Example:
<samp>Hello
Hello
Hello</samp>

    repeat {times: 3} ^{
      print "Hello"
    }

Example 2:
<samp>Hello in just a second
Hello in just a second
...</samp>

    repeat {every: 1000} ^{
      print "Hello in just a second"
    }





### after

- `after{delay: milliseconds} → ^(^{...})`, `after(milliseconds) → ^(^{...})` — Returns an "executor" function which when called will execute the passed function after *delay* number of milliseconds.

Example:
<samp>3 seconds later</samp>

    after {delay: 3000} ^{ print "3 seconds later" }



