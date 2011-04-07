# How to Move {#how-to-move}

Move takes a mix of concepts proven successful in other programming languages,
simplifies these concepts in the context of non-computer scientists while
avoiding some of the more obscure constructions.

By learning to program with Move you will learn what programming is. A common
misconception about programming is that you learn a language. That's not entirely
false, but what takes time and effort is learning how to *design* programs. So by
learning a simple but yet fully featured language like Move, you minimize the
initial effort required to get up to speed and can dive into the adventure of
software design much earlier, not having to spend too much time thinking about
the language itself.


## Why? {#how-to-move/1}

The first thing we must discuss is *"Why should I learn to program computers?"*.
It's a very good question without a single and universally good explanation, so
let's simplify the answer: **To create things**.

Programming is usually a good fit for one or both of the following things:

1. Realizing ideas, like creating a website or a game. Or having the computer
   draw you some graphics based on some data.

2. Simplifying and speeding up otherwise tedious, repetitive work. For instance,
   having the computer walk through thousands of files to find certain sentences.

The tricky part is that programming is by definition abstract and our brains
work best with concrete stuff, like "here's a stone, move it over there".
Just like writing a novel or painting a fictional picture, programming works on
a level above the actual result.

Say we want to make a web site which changes
the color of its background according to the time of day
(for instance dark colors during the night and bright colors during the day), we
need to *visualize the results* before we start working. Just as the painter
visualizes her motif before drawing it. When we have a good enough picture in
our head of what we want to create it's time to start programming. So, in a way
we work our way from an abstract idea to a concrete result.

And it's fun.

Now, let's get Moving!


## Values and data {#how-to-move/2}

A *value* is a piece of information. Something that *does not do anything* but
is rather used by and passed around a program. You can think of a *value* as the
coffee in your coffee cup. There are only five different types in Move.

The first two types of values are *simple values*:

- `5.31` — A number
- `"John"` — A piece of text

The other two value types are so called *compound values* — values which
*hold other values*:

- `[1, 2, 3]` — A list (with three number values)
- `{a:1, b:2}` — An object (with two number members)

*Compound types* can contain any other value, including other *compound types*
which makes these little buggers a very powerful tool.

The fifth kind of value is a special kind of object called *function*:

- `^(a, b){ a + b }` — A function which produces the sum of two numbers


## Organizing values {#how-to-move/3}

When you want to keep a value around there's something called a *variable*.
To put a value into a variable, we make up a name for the variable, then use
the *equal sign* (`=`) and finally write our value.

Here we store the value `"Julia"` into a variable called `name`:

    name = "Julia"

Later in our program we can refer to `name` and get the value `"Julia"` back.
For instance, we might output the value of `name` to the screen:
<samp>Julia</samp>

    print name

As the name suggests, a *variable* can *vary*, meaning we can assign any value
to a variable at any time.

For example, if we want our program above to output another name, we
simply assign another value to our `name` variable:

    name = "John"

When we print `name`, "John" is displayed rather than "Julia". Pretty neat, huh?!


## Reusable programs with *functions* {#how-to-move/4}

A *function* is a block of code which can be called (or "performed" if you will)
many times. We can put commonly used code inside functions to avoid re-writing
the same thing several times.

*Functions* are actually just *objects* (one of the five kinds of values we
looked at earlier) with the addition of some code attached to it. Here is a simple
function which glues together the text "Hello " with our `name` variable:

    hello = ^{ "Hello "+name }

Earlier we used something called `print` to output values to the screen. `print`
is not magic, but just a simple *function* which knows how to display
values on the screen.

Let's see what happens when we print our `hello` function:
<samp>[Function: hello]</samp>

    print hello

But... What?! Well, we only printed the *function* but we never *called* it, so
our code that glues together text was never run. Let's try it again, but this time
we add two curly brackets at the end of `hello`. This will tell Move to
*call the function*:
<samp>Hello John</samp>

    print hello{}

Functions are a very powerful tool when writing programs.

When creating a function, we can specify *function arguments*, which are
surrounded by parentheses and put in between the "^" and the "{".
These "arguments" are just like *variables*, but which are only available inside
our function.

Let's add a "title" argument to our `hello` function:

    hello = ^(title: "Mr."){ "Hello "+title+" "+name }

When calling a function you can pass it arguments:
<samp>Hello Ms. John</samp>

    print hello {title: "Ms."}

Notice how we wrote `title: "Mr."` when we created our `hello` function.
This is the *default value* of the "title" argument.

Let's call our function again, but this time we don't specify the "title" argument:
<samp>Hello Mr. John</samp>

    print hello{}

See. `title` represents its *default value* ("Mr.").

For simple functions like our `hello` it might become "clutterish" or generally
cumbersome to write `{title: "Ms."}` every time. In these cases, there's an
alternate way of calling functions: the *shorthand call-style* which gives a
function's arguments *in the order they where defined when creating the function*:
<samp>Hello Ms. John</samp>

    print hello "Ms."

...

*This guide is currently work in progress and will evolve over time*
