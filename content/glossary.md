# Glossary

Every term a Learn section puts in **bold** is defined here. `tests/content.test.ts` fails
if a lesson bolds something this page does not define, so this list grows with the lessons
rather than after them.

Terms are listed in the order a kid meets them.

## Run

The button that makes the robot do what your code says. Nothing happens until you press it,
so you can type as much as you like and try it whenever you want.

## power

How hard a motor is told to spin, from `-1.0` to `1.0`. `0` is stopped, `1.0` is full speed
forwards, `-1.0` is full speed backwards, and `0.5` is half speed forwards. Power is a
request, not a promise: the same power travels a different distance on a tired battery.

## milliseconds

Thousandths of a second. `sleep(1000)` waits one second, `sleep(500)` waits half a second.
The robot counts time this way because a thousandth of a second is roughly how long one
trip around a robot program takes.

## error message

What the robot says when your code does not make sense to it. It names what confused the
robot and the line where it got confused. An error message is not a telling-off; it is the
most useful thing on the screen.

## line number

The number down the side of the editor. Every error message carries one, and it tells you
where to look. The mistake is on that line or just above it.

## variable

A name that holds a value. You make one by saying what kind of value it holds, the name
you want, and the starting value: `int driveTime = 1500;`. After that, writing the name
anywhere means the value. Change it in one place and everywhere that uses it changes too.

## int

A whole number, with no decimal point. Good for things you count, like sides of a square
or encoder ticks. An `int` cannot hold `0.6`.

## double

A number with a decimal point. Good for amounts, like motor power or seconds. Motor power
runs from `-1.0` to `1.0`, so power is nearly always a `double`.

## boolean

A value that is either `true` or `false`, and nothing else. You usually get one by
comparing two numbers, like `speed > 0.5`. Booleans are what `if` asks about.

## String

Text, written inside double quote marks: `"Nebula"`. Join pieces together with `+`. A
`String` holding `"4"` is text, not the number 4.

## operator

A symbol that does something to numbers. `+` adds, `-` takes away, `*` multiplies, `/`
divides, and `%` gives the remainder left after dividing. Between two `int` values, `/`
throws the remainder away rather than rounding.

## if

A way of giving the robot a choice. `if (condition) { ... } else { ... }` runs the first
block when the condition is true and the second when it is false, never both.

## condition

The question inside an `if` or a loop's brackets. It has to be a `boolean`, so it is
usually a comparison like `distance > 20`.

## loop

A block of code that runs more than once. A `while` loop repeats until its condition is
false. A `for` loop repeats a counted number of times.

## for

A loop that counts. `for (int side = 1; side <= 4; side++)` says where to start, how long
to keep going, and what to change each time round.

## nested loop

A loop inside another loop. The inner one finishes completely every time the outer one
goes round once, so two loops of four run the inner block sixteen times.
