---
id: t3-direction-and-reversing
title: Which way is forward
tier: 3
minutes: 25
concept: The right-hand motors are bolted on mirrored, so they have to be reversed before the robot can drive straight.
robot: mecanum
explorerLockedRanges: [[1, 21]]
---

## Mission

All four wheels get the same power, and the robot finally drives in a straight line.

## Watch

The robot drives straight up the field. Four equal powers, going somewhere sensible at last.

## Learn

Press Run before you change anything. All four motors have a power of `0.5`, and the robot spins on the spot.

Here is why. The motors on the right are bolted on facing the opposite way from the ones on the left. They are mirror images. So when the left side is told to turn forwards and the right side is told the same thing, the right side pushes backwards, and the robot spins.

The fix is two lines in `init`:

```
frontRight.setDirection(DcMotor.Direction.REVERSE);
backRight.setDirection(DcMotor.Direction.REVERSE);
```

`setDirection` tells a motor to treat positive power as the other way round, from now on. After that, `0.5` means forwards on all four wheels and the robot drives straight.

This is setting up, so it belongs in `init` and happens once.

:::why
`Direction` is an enum with exactly two values, `FORWARD` and `REVERSE`, which is why you cannot misspell it: `DcMotor.Direction.REVERS` will not compile, whereas `"REVERSE"` as text would have compiled and quietly done nothing.

Reversing also flips the encoder. A motor told to run in reverse counts its ticks in reverse too, so forward motion always gives you rising numbers on every wheel. Without that, Tier 4's encoder lesson would need different sums for the left and right sides.

Which side needs reversing depends entirely on how your robot is built, and there is no way to work it out from the code. The way every team does it is to put the robot on blocks, run a program that gives all four motors a small positive power, and look at which wheels turn the wrong way. Those are the ones that get a `REVERSE` line.

Two lines in `init`, written once, and the rest of your season's code gets to assume forward means forward.
:::

## Try

Press Run first and watch the robot spin, so you have seen the problem.

Then write the two `setDirection` lines in `init` and run it again.

## Check

The checks want the robot to drive at least 80 cm and to still be facing the way it started, which only happens when the right side is reversed.

## Boost

Reverse the left side as well, so all four are reversed, and press Run. Which way does the robot go now? Then reverse only `frontRight` and watch it slew.
