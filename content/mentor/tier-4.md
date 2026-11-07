# Mentor guide: Tier 4, Mission Control

Eight lessons, three to four hours. Mecanum. This is the tier that wins matches, and it is
where a kid stops telling the robot what to do and starts telling it what to achieve.

## What they already have

A working TeleOp, the mecanum mixing, telemetry, and the habit of putting setup in `init`.
They have never written an autonomous.

## Common mistakes, in the order you will see them

**`OpMode` habits in a `LinearOpMode`.** Lesson 01. Some will look for `init` and `loop`.
One method, top to bottom, like Tiers 0 to 2.

**Moving before PLAY.** Lesson 02. Without `waitForStart()` nothing happens at all, because
`opModeIsActive()` is false, and that confuses them more than movement would. Point at the
guard.

**`while (opModeIsActive())` during INIT.** Lesson 02's Builder panel. It never runs,
because the OpMode is not active until PLAY. Anything before PLAY needs
`while (!isStopRequested())`. Teams meet this when aiming a camera.

**`timer.reset()` in the wrong place.** Lesson 03. Before `waitForStart` means the clock
started when the robot was switched on, so the first step is already over.

**The encoder order.** Lesson 04: target, then mode, then power. Setting power before
`RUN_TO_POSITION` makes the robot lurch and then correct, which looks like a hardware
fault.

**Integer division in the tick maths.** Lesson 04. `100 * (178 / 10)` is 1700 and the robot
is 4.5 cm short. Tier 1 lesson 05 coming back to collect.

**Waiting on one motor.** Lesson 04 does this on purpose for simplicity. Worth saying out
loud that real code checks all four, because a slipping wheel arrives late.

**The yaw wrap.** Lesson 05's Builder panel and the most expensive bug in the tier. Yaw
runs -180 to 180, so a loop waiting for 190 never ends. If a kid's turn hangs, this is it.

**Overshoot blamed on the sensor.** Lesson 05. At `0.3` it is about a degree; at `0.9` it
is several plus the robot's own weight. The fix is Tier 5, and saying so is better than
pretending it is not happening.

**Reading a sensor once, before the loop.** Lessons 06 and 07. They store it in a variable
and test that forever, so the condition never changes. This is the frozen boolean from
Tier 1 lesson 03 in its most expensive form.

**No timeout.** Every lesson's Builder panel mentions it and most kids skip it. A sensor
that never reads what the code expects means a robot driving into a wall until the match
ends. Make the Tier 4 checkpoint Boost non-optional if you can.

**No `park()` between steps.** Lesson 08. A motor holds its last command, so the wheels
keep driving into the next step and the robot drifts through its turn. This causes more
confusing autonomous behaviour than any sensor.

## What to say when a kid is stuck

- "Put the sensor reading on telemetry and watch it." Solves most of this tier.
- "What would make that loop condition false?" If they cannot say, the loop will hang.
- "What happens if the sensor never reads that?" Teaches the timeout better than telling.
- When a turn hangs: "what does the yaw read right now?" Leads straight to the wrap.
- When the robot drifts between steps: "what power are the wheels on during the turn?"

## What this tier does not cover

Proportional control, state machines and anything that reacts during a step. The three
steps here are a chain, and the chain's weakness is named in the checkpoint's Builder
panel so Tier 5 has somewhere to go.

## Checkpoint rubric: Full autonomous

| | Not yet | Got it | Going further |
|---|---|---|---|
| **Step one** | Drives into the wall, or stops at a guessed time | Stops about 20 cm out, on the sensor | Has a timeout as well |
| **Step two** | Turn timed, or overshoots badly | Lands within a few degrees on the IMU | Knows why it overshoots |
| **Step three** | Drives a fixed distance | Finds the tile by comparing colour channels | Would still work under different lights |
| **Robustness** | One failure stops everything | Parks between steps, reports each one | Every step has a timeout |

**One question before they move on:** "What happens if someone stands in front of the
distance sensor?" A kid who answers "it stops early and the rest still runs" has understood
the tier. A kid who says "it would get stuck" has understood it better.
