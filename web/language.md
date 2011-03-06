# Language reference {#language}

This is a summary of the Move language and not a complete reference. Please see [the ECMA-262 specification](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-262.pdf) for details.

## Value types {#types}

There are five different value types in Move: numbers, text, lists, objects and
functions.

### Numbers {#types/number}

Numbers can be written in either decimal, hexadecimal or octal notation.

- Decimal notation: `1234`, `5.31` or `.8` — Starts with zero or more digits
  (0-9), has an optional dot ("." aka "full stop") followed by zero or more
  digits. The regular expression used by the Move parser to interpret decimal
  numbers is: `/^\d*\.?\d*(?:e[+-]?\d*(?:\d\.?|\.?\d)\d*)?$/i`

- Hexadecimal notation: `0x4d2` or `0x5` — Starts with "0x" and is followed by
  one or more hexadecimal digits (0-9, a-f) where the "alpha digits" (a-f) can
  be written in either lower case, upper case or a mix thereof.
  Only integers can be expressed in "hex" notation.
  Regular expression used by the parser: `/^0x[0-9a-f]+$/i`

- Octal notation: `02322` or `0664` — Starts with "0" and is followed by one
  or more octal digits (0-7). Regular expression used by the parser:
  `/^0[0-7]+$/`

- "Not a number": `NaN` — A special constant
  used to represent an illegal computation or a failed to-number conversion.

The Number type has exactly 18437736874454810627 (that is, 2<sup>64</sup>-2<sup>53</sup>+3) values, representing the double- precision 64-bit format IEEE 754 values as specified in the IEEE Standard for Binary Floating-Point Arithmetic, except that the 9007199254740990 (that is, 2<sup>53</sup>-2) distinct “Not-a-Number” values of the IEEE Standard are represented in ECMAScript as a single special NaN value.

Example:
<samp>1234
1234
1234
true</samp>

    print 1234
    print 0x4d2
    print 02322
    print 1234 == 1234.0


### Text {#types/text}

Text can contain any Unicode characters and is stored as UTF-16 text. A piece of
text is denoted by enclosing quotation marks (" and " or ' and ') with any text except line breaks or (same as the enclosing) quotation marks. Standard
escape sequences (like "\n" and "\t") as well as Unicode
escape sequences ("\u" followed by four hexadecimal digits) can be used to encode any Unicode character into the text, like line breaks. The backslash character ("\") can also be used to escape characters like an embedded quotation
mark.

- Text: `"John"` — A piece of text representing "John"

- Text with Unicode escape sequence: `"John \u2665 Jane"` — A piece of text
  representing "John ♥ Jane"

- Text with embedded quotation marks: `"John aka \"Johnny\""` — A piece of text representing "John aka "Johnny""

- Text with embedded quotation marks wrapped in single quotes: `'John aka "Johnny"'` — A piece of text representing "John aka "Johnny""

Text is internally represented by *Text* objects (an alias for *String* JavaScript objects). Adding functions to the
*Text* object's prototype will make that function available to any text value.

Example of calling the built-in <tt>split</tt> function on a piece of text to produce a list of
substrings:
<samp>["Kittens", "are", "cute"]</samp>

    print "Kittens are cute".split(" ")


### Lists & arrays {#types/list}

A List (or Array) is a form of compound value which contains other values in a
ordered sequence. Lists are composed by enclosing zero or more values in a square bracket character pair ("[" and "]"), separated by comma characters. Lists can also be created by programmatic composition. The built-in <tt>Array</tt> object's prototype is the prototype used for new lists.

- `["Kittens", "are", "cute"]` — A list containing three pieces of text: "Kittens", "are" and "cute"

- `["Kittens", 123, ["are", "cute"]]` — A list containing three values of different types: some text, a number and another list.

Example of programmatic composition:
<samp>["Kittens", "are", "cute"]</samp>

    list = []
    list.push "Kittens"
    list[1] = "are"
    list[list.length] = "cute"
    print list


### Objects {#types/object}

The Object type is fundamental to Move (and JavaScript) as all other values are in fact Objects. E.g. a Number is a special type of Object. We say that "Move contains five different types of values" which is a simplification. Move has in fact only one type — Object — but at the same time,
the language and the runtime *treats some Object subtypes differently*, like Numbers which can be used for mathematical operations or text which when "added"
together creates a new piece of text being the two texts glued together. Therefore we simplify value types by saying there's only five of them.

An Object is a set of (unique) keys with associated values. Keys must be text values, but an associated value can be of any type. Objects are denoted by a pair of curly brackets ("{" and "}") holding zero or more key-value pairs. Keys are written either as regular text with wrapping quotation marks or without wrapping quotation marks for text which conforms to the rule that it is a valid name (starts with a-z, A-Z, _ or $ and is followed by zero or more letters, numbers, etc). A key is terminated by a colon character and is followed by a value expression. Two successive key-value pairs are separated by a comma character.

- `{a:1, b:2}` — An object with two pairs: Key "a" represents the value 1 and
  key "b" represents the value 2.

Example:
<samp>1
2
undefined
3</samp>

    obj = {a:1, "b-B":2}
    print obj.a
    print obj["b-B"]
    print obj.c
    obj.c = 3
    print obj.c


### Functions {#types/function}

Functions are denoted by a circumflex accent character ("^") optionally followed by argument declarations wrapped in a parenthesis character pair ("(" and ")"), finally followed by a block of code wrapped in a pair of curly bracket characters ("{" and "}").

The block of code in a function has it's own scope — a variable defined (assigned for the first time) in such a block will "live" in that block, thus any references to that variable *before* the declaration of the code block will
refer to *another*, probably undefined, variable.

The last statement in a function's code block is *returned*. There's also a special "return" keyword which can be used to prematurely return a value from
a function.

Arguments can have explicit default values which are denoted by a postfix assignment operator ("=") for the argument name followed by a value. If no explicit default value is given, the "undefined" atom is used.

- `^(a, b){ a + b }` — A function which produces the sum of two numbers

- `^{ 5 + 7 }` — A function which does not expect any arguments

- `^(a: 5, b: 7){ a + b }` — A function with default values for its arguments

- &nbsp;<code>^(a, b){ if (a > 4) return a; a + b }</code> — A function which use the "return" keyword to, in some cases, prematurely return a value and stop execution of that function's code.

Here is an illustrating example of how scope works. The following code will yield a reference error with the message "x is not defined" since "x" is defined in the "y" function's scope and is thus not available to the outer scope:
<samp>ReferenceError: x is not defined
...</samp>

    y = ^{ x = 5 }
    y{}
    print x

Here we assign something to x in the outer scope which will tell Move that "x" should live and be available in that (outer) scope:
<samp>5</samp>

    x = 0
    y = ^{ x = 5 }
    y{}
    print x


### Atoms {#types/atom}

Move has a set of "atoms" which are basically pre-defined constants with itself as its value. They are called "atoms" since there is only one single, global and immutable instance (or "version" if you will) of each of these special values:

- `undefined` — Means that something is not defined. E.g. A function's argument without an explicit default value will have this atom as its value unless provided during a call to such a function.

- `null` — Means "empty" or "nothing". Handy in the case `undefined` is not suitable (i.e. you have defined a value but it's empty).

- `true` — Represents truth and is the product of a truthy logical comparison (e.g. <code>4 &lt; 6 == true</code>)

- `false` — Represents something being false or "no" and is the product of a false logical comparison (e.g. <code>4 &gt; 6 == false</code>)

Example:
<samp>true
true
true</samp>

    print true != false
    print undefined != null
    Yes = true
    print Yes == true


### Slices

Move features a syntax for extracting and assigning slices of collections.

- `"hello"[1:3]` — Yields "el"

- `[1,2,3,4][1:3]` — Yields [2,3]

- `x = [1,2,3,4]; x[1:3] = [9]` — Replaces items [2,3] with [9], leaving *x* as [1,9,4]

This special slice syntax compiles down to two different method calls depending on whether a slice is read or written:

- For reading/extracting slices a ***slice*** method is called on the left hand-side expression with the arguments. I.e. `foo[1:3]` compiles down to `foo.slice(1, 3)`. You can implement a "slice" method for any object to allow that object (prototype) to be accessible through slice notation. Both lists and text support slice access by default.

- For writing/modifying slices of collections a ***_move_setSlice*** method is called. I.e. `foo[1:3] = bar` compiles down to `foo._move_setSlice(1, 3, bar)`. A slice assignment operation returns the (old) slice that was replaced. You can implement a "_move_setSlice" method for any object to allow that object (prototype) to be modifiable through slice notation. Lists (but not text, which is immutable) support slice assignment by default.

*Slice syntax was introduced in Move 0.2.0*
