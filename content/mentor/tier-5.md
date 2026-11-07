# Mentor guide: Tier 5, Deep Space

Seven lessons, three to four hours plus an afternoon of setup. Mecanum, and then real
metal. Two of these lessons have no runner on purpose: lesson 05 is git and lesson 06 is
Android Studio, and the real work happens on the kid's own machine.

Plan for this tier to take longer than it looks. The programming is the short part.

## What they already have

A sensor-guided autonomous, a TeleOp, telemetry and the habit of guarding a loop. They
have not written anything that protects the robot from its driver.

## Common mistakes, in the order you will see them

**A limit that traps the arm.** Lesson 01. They clamp both directions at the top, so once
the arm is up it cannot come down. The fix is checking which way the power is going, and
the symptom is memorable enough to be worth letting happen.

**An unzeroed encoder.** Lesson 01's Builder panel, and the one that bites on real
hardware. A limit of 1100 means nothing if the arm started halfway up, so the mechanism
either stops early or does not stop at all. Decide as a team: park the arm before power on,
or add a touch sensor.

**A `while` loop inside `loop()`.** Lesson 02. The controls freeze and the robot looks
broken. This is the mistake the state machine exists to prevent, so name it before they
hit it.

**A missing `break` in the switch.** Lesson 02. Java falls through to the next case and the
robot runs two steps at once. Compiles fine.

**Not parking before changing state.** Lesson 02 again, same as Tier 4. Wheels keep their
last command into the next state.

**kP tuned by guessing.** Lesson 03. Too high and the robot hunts, too low and it crawls.
Have them try `0.05` and `0.002` from the Boost, because feeling both ends is how tuning
gets learned.

**No minimum power.** Lesson 03. The robot stops a few degrees short and hums. Friction,
not code. Worth saying plainly: no amount of control theory makes torque out of a power of
0.02.

**Reaching for PID immediately.** Some will want all three terms. P alone that lands within
a degree beats a PID nobody on the team can explain, and that is a judgement worth stating.

**A hardware class that is not `static`.** Lesson 04. Tied to one OpMode instance, which
defeats the point. The error is confusing; the fix is one word.

**Commits called "stuff".** Lesson 05. The question that fixes it: "at a competition, how
would you find the commit that broke the arm?"

**Working on main.** Lesson 05. Whatever is on main should be runnable right now. Teams
that break this rule turn up unable to run their own autonomous.

**Class name not matching the file name.** Lesson 06, and the first thing that goes wrong
in Android Studio. The error is clear once they know to expect it.

**Configuration names not matching the code.** Lesson 06, and the number one reason a first
upload does not run. It is set on the phone, not in the code, and somebody has to do it.

## What to say when a kid is stuck

- "Which way is the mechanism trying to go, and where is it already?" Both limit bugs.
- "How long does one pass of `loop` take?" Explains why a `while` inside it is fatal.
- "What is the error right now, and what power is that asking for?" All tuning problems.
- For git: "what changed since it worked?" That is the question git exists to answer.
- For Android Studio: read the error aloud. They are long and they are usually accurate.

## Running it on a real robot

Budget a whole session. Before anyone touches a battery:

1. Battery charged and clipped in, not resting on the frame.
2. Robot configuration on the Driver Station matches every name in the code.
3. Arm at the bottom, claw in a known position, before power on.
4. Robot on blocks for the first run of any new autonomous.
5. One person on the stop button whose only job is the stop button.

The first run will do something unexpected. That is the point of the blocks.

## Checkpoint rubric: TeleOp and Auto pair

| | Not yet | Got it | Going further |
|---|---|---|---|
| **Shared hardware** | Names copied into both OpModes | One `Hardware` class, used by both | Robot's tuning numbers live in it too |
| **The autonomous** | One step, or timed turns | Sensor approach plus a proportional turn | Every step has a timeout |
| **The TeleOp** | Drives, no limits | Drives and works the claw, with limits on the arm | Has a state machine for a scoring cycle |
| **Safety** | No checklist, no stop plan | Checklist written and used | Has run on a real robot without damage |
| **Version control** | Code in a folder | Repository with readable commits | Branch per feature, main always runnable |

**The question that ends the course:** "What would you change first on your team's robot?"
If they name a number to tune rather than a thing to learn, they are done here and should be
in the pit.
