---
id: t4-waitforstart
title: Waiting for the whistle
tier: 4
minutes: 20
concept: Nothing should move before PLAY, and nothing should keep moving after STOP.
robot: mecanum
explorerLockedRanges: [[1, 22]]
---

## Mission

The robot sets itself up, waits for the whistle, and only then moves.

## Watch

The robot sits still for a moment, then drives. The pause is it waiting to be allowed to start.

## Learn

A match has two buttons. INIT gets the robot ready. PLAY starts the clock.

Everything before `waitForStart()` happens on INIT. Everything after happens on PLAY:

```
waitForStart();
```

That one line stops your program where it stands until the driver presses PLAY. Moving before that is a rules violation, so this line is not optional.

The second half matters as much. `opModeIsActive()` is `true` between PLAY and STOP, and `false` outside:

```
if (opModeIsActive()) {
    ... drive ...
}
```

Wrapping your moves in that means pressing STOP ends them. Without it, a robot that is still part way through a long autonomous keeps going after the referee has called time.

Setting up goes before `waitForStart`. Moving goes after, inside the guard.

:::why
There is a third one, `isStopRequested()`, and it is the opposite of `opModeIsActive()` in the one case that matters: during INIT, before PLAY, `opModeIsActive()` is already false. So a setup loop written as `while (opModeIsActive())` never runs at all, and the right guard for anything before PLAY is `while (!isStopRequested())`.

Teams meet this when they try to aim a camera during INIT and find their loop does nothing.

The real reason `opModeIsActive()` matters is the one from last lesson: a `sleep(1500)` cannot be interrupted. Pressing STOP sets a flag, and your code only notices the next time it asks. An autonomous made of five one-second sleeps takes up to a second to respond, and that is with the guard in place. The fix, which Tier 5 builds, is to break long waits into a loop that checks every pass.
:::

## Try

Two TODOs. Add `waitForStart()`, then show `Started` as the `status` on telemetry and wrap the driving in `if (opModeIsActive())`.

## Check

The checks want `Started` on the Driver Station and the robot driving at least 80 cm. Without `waitForStart`, the OpMode is never active and nothing moves.

## Boost

Take `waitForStart()` out again and press Run. The robot does not move, and now you know which line was the reason.
