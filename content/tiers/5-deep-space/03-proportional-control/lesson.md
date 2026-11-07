---
id: t5-proportional-control
title: Easing in
tier: 5
minutes: 30
concept: Making the power depend on how far there is left to go stops the robot overshooting.
robot: mecanum
explorerLockedRanges: [[1, 38]]
---

## Mission

The robot turns to ninety degrees and settles there instead of swinging past it.

## Watch

The robot turns quickly at first, slows as it comes round, and stops square. Watch the error shrink on telemetry.

## Learn

Tier 4's turn ran at a fixed `0.3` until the yaw passed 90, then cut the power dead. The robot's own weight carried it a few degrees further.

**Proportional control** fixes that. Work out how far there is left to go, and make the power depend on it:

```
double error = target - yaw;
double power = error * kP;
```

`error` is the distance to the target. `kP` is a number you tune: large enough to move, small enough not to overshoot. Far away, the error is big and so is the power. Close in, the error is small and the robot creeps the last degree.

Two guards. Hold the power inside `-0.4` and `0.4`, because an error of 90 times `0.012` asks for more than full power. And do not let it fall below about `0.08`, because below that the motors cannot overcome friction and the robot stops short, humming.

Stop when the error is small enough rather than exactly zero. `Math.abs(error) < 1.0` is close enough and will actually happen.

:::why
This is the P of PID, and on an FTC drivetrain it is usually all you need.

The I is integral: add up the error over time, so an error that refuses to go away slowly builds more power. It fixes the arm that sags a few degrees below its target and stays there, because the P term at that tiny error is not enough to hold it. It also winds up badly if the mechanism is blocked.

The D is derivative: look at how fast the error is shrinking and pull back if it is closing too quickly. It damps the wobble you get from a kP tuned a bit high.

Tune in that order, and most teams stop after P. A turn with P alone that lands within a degree is better than a PID nobody on the team can explain.

The minimum power is not a hack, it is physics. Static friction needs a shove to break, and no amount of control theory produces torque from a power of 0.02.
:::

## Try

Write the loop. Error, stop test, power, two clamps, the minimum, the spin, telemetry, then park.

## Check

The checks want the robot facing 90 degrees within four degrees, which the fixed-power turn in Tier 4 could not promise, and `error` on telemetry.

## Boost

Change `kP` to `0.05` and watch it overshoot and hunt. Then to `0.002` and watch it crawl. Tuning is finding the middle.
