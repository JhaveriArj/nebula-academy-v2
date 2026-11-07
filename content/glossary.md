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

## method

A group of instructions with a name. Writing one does not run it; you run it by **call**ing
it. `private void driveOneSide() { ... }` makes one, and `driveOneSide();` runs it.

## call

Running a method by writing its name followed by round brackets, like `turnLeft();`.
Anything the method needs goes inside the brackets.

## parameter

A variable a method is handed when you call it. `driveForward(double seconds)` has one
parameter, so `driveForward(1.5)` runs the method with `seconds` holding 1.5. The
parameter only exists inside the method.

## cast

Writing a kind in round brackets to turn a value into it, like `(int) 3.7`. A cast cuts
the decimal part off rather than rounding, so `(int) 3.7` is 3. Java asks for a cast
whenever something could be lost.

## return

What a method hands back to whoever called it. A method that returns something says what
kind instead of `void`: `private int msForCm(int cm)` promises an `int`, and `return`
inside it both hands the value back and stops the method.

## class

A blueprint. It says what a kind of thing remembers and what it can do. `class Robot` does
not make a robot; it describes one.

## field

A variable that belongs to a class, so every object made from that class has its own copy.
Fields are written near the top of the class, outside any method, which is what lets every
method in the class reach them.

## object

An actual thing built from a class, made with `new`. One class can make many objects, and
each one remembers its own values.

## new

The word that builds an object from a class: `Robot rover = new Robot(leftDrive, rightDrive);`
The round brackets hand values to the class's constructor.

## constructor

A special method that runs once, when an object is built. It has the same name as the class
and no return kind, and its job is to fill in the object's fields.

## OpMode

A program the Driver Station can run. You write a class that `extends OpMode`, and the
robot calls your `init` and `loop` methods rather than you calling them. `@TeleOp` or
`@Autonomous` above the class is what makes it appear in the list on the driver's phone.

## init

The method that runs once, when the driver presses INIT. Setting up goes here: fetching
motors, reversing a side, zeroing a counter.

## loop

The method that runs over and over, about fifty times a second, while the OpMode is
playing. Watching goes here: reading sticks and sensors, deciding, and telling motors what
to do. It keeps nothing between passes, so anything to remember has to be a field.

## hardware map

The robot's list of parts and their names, reached with `hardwareMap.get`. The name in your
code has to match the name in the robot configuration exactly, capital letters and all.

## interface

A list of what some kind of part can do, without saying how it does it. `DcMotor` is an
interface, which is why the same `setPower` line works on every motor your team bolts on.

## telemetry

The readout on the driver's phone. `telemetry.addData("key", value)` builds a line and
`telemetry.update()` sends what you have built. Nothing appears until you call `update`.

## gamepad

The controller. `gamepad1` is the first driver's, `gamepad2` the second's. Sticks give a
number from -1.0 to 1.0, buttons give `true` or `false`, and pushing a stick forward gives
a **negative** number.

## mecanum

A drivetrain whose four wheels have angled rollers, letting the robot drive, slide
sideways and spin without turning first. All four motors get a different power, worked out
from what the driver asked for.

## strafe

Sliding sideways without turning. Only a mecanum robot can do it, and it is slower than
driving straight forward.
