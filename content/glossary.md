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
