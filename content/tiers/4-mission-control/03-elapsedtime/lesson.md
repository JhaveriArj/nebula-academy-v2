---
id: t4-elapsedtime
title: sleep or a clock
tier: 4
minutes: 25
concept: A timed loop waits the same length as sleep, and keeps looking while it waits.
robot: mecanum
explorerLockedRanges: [[1, 25]]
---

## Mission

The robot drives for two seconds and watches the clock the whole way.

## Watch

The robot drives for two seconds. Watch the telemetry count up while it goes.

## Learn

`sleep(2000)` waits two seconds with its eyes shut. Nothing is read, nothing is decided, nothing can stop it early.

An `ElapsedTime` is a stopwatch:

```
ElapsedTime timer = new ElapsedTime();
timer.reset();
while (opModeIsActive() && timer.seconds() < 2.0) {
    ... drive ...
}
```

`timer.seconds()` hands back how long since the last `reset()`, as a double. The loop keeps going while that is under two, so it waits the same two seconds `sleep` would.

The difference is what happens inside. Every time round, your code runs again: it can read a sensor, update telemetry, change a power, or decide to stop early.

`timer.reset()` goes after `waitForStart()`, so the clock starts when the match does, not when the robot was switched on.

:::why
This is the pattern every good autonomous is built from, because it combines a time limit with a condition. Real code looks like this:

```
while (opModeIsActive() && timer.seconds() < 3.0 && distance.getDistance(CM) > 20) {
```

Drive for up to three seconds, or until the wall is close, whichever happens first. A `sleep` cannot express that, and without the time limit a robot whose sensor never reads what it expects drives into a wall until the match ends.

Known as a timeout, and it is the difference between an autonomous that fails safely and one that scores zero and breaks something.

Note the loop condition is checked before each pass, so the robot can overshoot by one pass, which at 50 passes a second is about a centimetre. That is fine here and matters for encoders next lesson, which is why `isBusy()` has a tolerance built in rather than waiting for an exact tick count.
:::

## Try

Write the timed loop. Drive forward at `0.5` while the OpMode is active and the timer is under `2.0`, showing `timer.seconds()` on telemetry each pass, then stop.

## Check

The checks want the robot driving at least 100 cm, telemetry showing a key called `seconds`, and the whole run finishing inside five seconds.

## Boost

Add `&& timer.seconds() < 1.0` as a second condition on the same loop and watch it stop early. Then try showing `timer.milliseconds()` on telemetry instead.
