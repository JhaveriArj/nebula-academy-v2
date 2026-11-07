# Mentor guide: Tier 1, Orbit

Eight lessons, two to three hours. Tank robot. This is where a kid stops copying and
starts writing. By the end they have variables, types, operators, decisions and loops,
which is most of what any program is made of.

## What they already have

Tier 0: they can press Run, read an error and find the line it names. Do not assume more.
They have seen one `int` in lesson 04 if they did the Boost.

## Common mistakes, in the order you will see them

**They change a variable in the wrong place.** Lesson 01's whole point is changing one
number at the top, and about half will change the `sleep(driveTime)` line instead. Ask
them which line the value lives on.

**`int speed = 0.6;`** Lesson 02 asks for this on purpose in the Boost, and plenty will do
it by accident first. The error names both types, which is the lesson.

**One `=` where they meant two.** Lesson 03 onwards. In Java this usually refuses to
compile, which is a kindness. Say "one equals puts a value in, two equals asks a question".

**`"Pilot" + pilot` with no space.** Lesson 04. They will insist the code is right because
the words are right. Point at the quote marks and ask where the space is.

**They expect `90 / 60` to be 1.5.** Lesson 05, and this is the most valuable confusion in
the tier. Do not shortcut it. Ask what kind of thing an `int` can hold, then ask where the
half could possibly go.

**`cm / 60 * 1000` instead of `cm * 1000 / 60`.** Same lesson. The program runs and the
robot stops 30 cm short. Ask them to work out the first step on paper.

**Missing braces on an `if`.** Lesson 06. One line works, so they leave them off, and then
the second line always runs. Insist on braces every time; it costs nothing and prevents an
afternoon.

**The loop that never ends.** Lesson 07, usually a `while` with no counter change. Nebula
stops it and keeps their code. Point at the line that was supposed to change the value.

**Off by one in the countdown.** Lesson 08: `count > 1` stops at 2, `count >= 0` prints a
zero. This is the single most common loop bug there is, forever, so name it.

## What to say when a kid is stuck

- "What do you think is in that variable right now?" Then: "print it and find out."
- "Read the loop out loud: start at what, keep going while what, change what?"
- For a wrong number: "work out the first step on paper." Almost always finds it.
- For `if`: "what would make that question false?" If they cannot answer, the condition is
  the bug.
- Printing is the debugger. A kid who reaches for `System.out.println` unprompted has
  learned the most transferable thing in this tier.

## What this tier does not cover

Methods, classes, objects, telemetry, the gamepad. If a kid is annoyed at copying eleven
lines four times in lesson 07's Boost, that is Tier 2 and you can promise it.

## Checkpoint rubric: Launch sequence

| | Not yet | Got it | Going further |
|---|---|---|---|
| **The countdown** | Prints some numbers, wrong order or wrong count | 10 down to 1, in order, then Launch | Counts down with a message that changes near zero |
| **The abort** | Robot drives whatever the fuel is | Low fuel prints the abort and nothing moves | Abort says how much fuel is short |
| **Using a variable** | Numbers typed in twice | One variable, used everywhere it should be | Named well enough to need no comment |
| **Reading a loop** | Copies the loop line without reading it | Can say what each of the three parts does | Changed the loop to count up instead |

**One question before they move on:** "Make it count down from twenty instead." If they
change only the start value, they have understood the loop.
