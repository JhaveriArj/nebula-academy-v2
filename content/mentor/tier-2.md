# Mentor guide: Tier 2, Docking

Seven lessons, two to three hours. Tank robot. This is the tier that makes Tier 3 readable,
and it is the one most likely to be rushed. Do not let it be. A kid who meets
`hardwareMap.get(DcMotor.class, "frontLeft")` without having written a method and built an
object is copying shapes for the rest of the course.

## What they already have

Variables, types, operators, `if`, `while`, `for`. They have written a square three
different ways and should be tired of it.

## Common mistakes, in the order you will see them

**The method goes in the wrong place.** Lesson 01, and this is the big one. A method
belongs inside the class but outside `runOpMode`, which means after one `}` and before the
last one. Brace counting is the skill; let them count out loud.

**They write the method and never call it.** Nothing happens and they conclude the method
is broken. Ask: "where does the robot find out it should do this?"

**They call it without brackets.** `driveOneSide;` does not compile. The brackets mean
"do it".

**Motors moved to fields confuses them.** Lesson 01 moves `leftDrive` above `runOpMode` so
methods can see it. Worth one sentence: things written at the top of the class are visible
to everything in the class.

**`sleep(seconds * 1000)` with no cast.** Lesson 02. The error says `incompatible types`,
and the fix is `(long)`. Remind them a cast cuts rather than rounds.

**They use the parameter name outside the method.** `cannot find symbol`. This is scope,
and it is worth naming properly: the parameter only exists inside.

**`void` on a method that returns something.** Lesson 03. Java says `missing return
statement` if they add the return, or complains about the return if they do not. Either way
the fix is the word before the method name.

**`name = name;` in the constructor.** Lesson 05, and it compiles. The field stays `null`,
the robot prints `null`, and nothing says why. This is the single best `this.` lesson
available and it is worth letting them hit it.

**They expect two objects to share values.** Lesson 05. `square.sides` and
`triangle.sides` are separate. Ask them how many plans exist.

**Lesson 07 feels like a lot at once.** It is: a class, a constructor, three methods and
`this` passed in. Build `driveForward` alone and run it before writing the other two.

## What to say when a kid is stuck

- "Count the braces out loud from the top." Fixes most lesson 01 problems unaided.
- "Is this a command or a question?" Decides `void` versus a return type.
- "How many of these exist right now?" Untangles nearly every object confusion.
- "What is `this` pointing at on that line?" For constructor trouble.
- When a method does nothing: "show me the line that runs it."

## What this tier does not cover

The FTC SDK, telemetry, the gamepad, sensors. Lesson 06 deliberately points at
`hardwareMap.get` and says "next tier". If a kid asks what it means, that is a good sign.

## Checkpoint rubric: Robot helper class

| | Not yet | Got it | Going further |
|---|---|---|---|
| **The class** | Fields or constructor missing, or `this.` left off | `Robot` holds its motors and fills them in | Added a method the lesson did not ask for |
| **The three methods** | One works, others copied wrong | `driveForward`, `turnLeft`, `turnRight` all work | Turns take a number of degrees |
| **The mission** | Motor lines still in `runOpMode` | Three readable lines calling the object | Mission is a loop over the methods |
| **Reading the dot** | Cannot say what is left of the dot | Can explain `robot.turnLeft()` in their own words | Can explain `hardwareMap.get` before being taught it |

**One question before they move on:** "If the robot got a third motor, where would the code
change?" The answer should be "inside `Robot`", and once a kid says that, the tier has
worked.
