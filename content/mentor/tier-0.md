# Mentor guide: Tier 0, Launchpad

Four lessons, about an hour. Tank robot. The goal is not Java — it is that a kid who has
never written a line of code presses Run, sees a robot move, breaks something, reads the
message, and fixes it. Everything after this tier depends on them believing an error is
information rather than failure.

## What they already have

Nothing. Assume no coding at all. Some will have seen Scratch; it does not transfer much
beyond "instructions happen in order", which is worth saying out loud.

## Common mistakes, in the order you will see them

**They change the number but do not press Run.** By far the most common. The editor shows
the new code and the field shows the old run. Point at the Run button, not the code.

**They edit a locked line and wonder why nothing typed.** Explorer mode greys out
everything outside the TODO. Say "that part is already done for you" rather than "you
can't edit that".

**They delete a brace while experimenting and cannot get back.** Lesson 02 asks them to do
this on purpose, and some will not restore it exactly. There is a Reset button on the
editor. Using it is not cheating.

**They type a curly quote.** Copying text out of a document or a chat gives `"` instead of
`"`. The error says `illegal character`. This one is worth showing them once, because it
looks identical on screen and they will hit it again.

**Lesson 03, program 4: they write `int four = "4";` and argue that it is a number.** It is
the single best teaching moment in the tier. Quote marks mean text, and text that looks
like a number is still text. Ask them what `"4" + "4"` should be.

**Lesson 04: they build one side and then copy it wrong.** Usually they copy the drive but
not the turn, so the robot drives a long straight line. Ask them to count the corners out
loud while watching the field.

**Lesson 04: the square does not quite close.** Expected. The checks allow 30 cm of slop.
If a kid wants it perfect, that is Tier 4 and you can tell them so.

## What to say when a kid is stuck

- "Read me the error out loud." Nine times in ten they find it themselves while reading.
- "What line number does it say?" Then: "Look at that line, and the one above it."
- "What did you expect the robot to do, and what did it do?" The gap between those two
  sentences is almost always the bug.
- Resist typing. Point at the line instead. A kid who watches you fix it has learned that
  you can fix it.

## What this tier does not cover

Variables beyond one `int`, loops, methods, the gamepad, and telemetry beyond the
`addData` and `update` lines that put an answer on the Driver Station. If a kid asks why they
are copying eleven lines four times in lesson 04, the honest answer is "because loops are
the next tier and you are about to be very pleased about them".

## Checkpoint rubric: Square and signature

Printable. The checkpoint passes automatically when the checks go green; this is for
talking to a kid about their work.

| | Not yet | Got it | Going further |
|---|---|---|---|
| **The robot drives a square** | Drives, but not four sides | Four sides, four corners, finishes near the start | Square is tight enough to drive twice and still close |
| **The signature** | No name, or the name is missing its `telemetry.update()` | Their name on the Driver Station after the last corner | Shows something extra, like how many sides it drove |
| **Reading errors** | Waits to be told what is wrong | Finds the line number and looks there | Predicts the error before pressing Run |
| **Owning the keyboard** | Watches someone else type | Types and tries things | Changes numbers just to see what happens |

**One question to ask before they move on:** "If I asked you to make the square twice as
big, what would you change?" If they say the `sleep` number on the drive lines and not the
turn lines, they have understood the tier.
