---
id: t5-state-machines
title: One job at a time
tier: 5
minutes: 30
concept: A state machine runs a sequence inside loop without ever blocking the driver.
robot: mecanum
explorerLockedRanges: [[1, 35]]
---

## Mission

One press of A sends the robot through a two-step routine while the driver keeps control.

## Watch

A is pressed. The robot drives, then turns, then stops. Watch the state name change on telemetry.

## Learn

Tier 4's autonomous used `while` loops in a row. That works because nobody is driving. In a TeleOp it would be a disaster: a `while` loop inside `loop()` freezes the controls until it finishes.

A **state machine** runs a sequence without ever blocking. You keep the current step in a field, and each pass of `loop` does a little of it:

```
enum State { IDLE, DRIVE, TURN, DONE }
private State state = State.IDLE;
```

Then `loop` asks which step it is in and does that bit:

```
switch (state) {
    case DRIVE:
        drive(0.5);
        if (timer.seconds() > 1.0) {
            park();
            timer.reset();
            state = State.TURN;
        }
        break;
```

Nothing waits. Each pass takes a moment, sets the motors, checks whether this step is finished, and returns. The driver stays in charge the whole time.

An **enum** holds the state because Java then checks the spelling for you.

:::why
Notice the shape of each case: do the thing, then ask whether it is done, and if it is, tidy up and move on. Every state has that same three-part body, which is what makes a long sequence readable.

The `park()` before changing state is the same rule as Tier 4: a motor keeps its last command, so a state that leaves the wheels running hands a moving robot to the next step.

The reason this scales is that the sequence and the driving are no longer competing. `loop` can run the state machine *and* read the sticks on the same pass, so a driver can be steering while the arm finishes a routine. That is impossible with a blocking loop and it is exactly what a scoring cycle needs.

The same pattern runs the best autonomous code too. Written as an `OpMode` state machine rather than a `LinearOpMode` chain, every pass can check every condition, so a robot can notice a wall during a turn instead of finding out two steps later.
:::

## Try

Write the `switch`. Four cases, each doing its bit and deciding when to move on.

`default` covers `DONE`, so the robot parks and stays parked.

## Check

The checks want `DRIVE`, `TURN` and `DONE` printed in order, the robot moving, and the state on telemetry.

## Boost

Add a `STRAFE` state between `DRIVE` and `TURN`. Then make B at any point jump straight back to `IDLE`, which is how a driver aborts a routine.
