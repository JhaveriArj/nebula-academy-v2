---
id: t2-parameters
title: Telling it how much
tier: 2
minutes: 20
concept: A parameter lets one method do the same job at different sizes.
robot: tank
explorerLockedRanges: [[1, 19]]
---

## Mission

The robot makes three moves of three different lengths, from one method.

## Watch

Three moves, one long, one short, one longer. The same instructions each time, with a different number.

## Learn

`driveOneSide()` always drove the same distance. To drive a different distance you had to write a second method, which is where you came in.

A **parameter** fixes that. It is a variable the method is given when you call it:

```
private void driveForward(double seconds) {
    leftDrive.setPower(0.7);
    sleep((long) (seconds * 1000));
    ...
}
```

`double seconds` goes in the round brackets. Inside the method, `seconds` behaves like any other variable.

Now you choose the value at the moment you call it:

`driveForward(1.5);`

That runs the method with `seconds` holding `1.5`. One method, any distance.

`(long)` in front of the sum is a **cast**. `sleep` wants a whole number of milliseconds, and `seconds * 1000` is a double, so the cast cuts off the decimal part.

:::why
The parameter name belongs to the method, and nothing outside can see it. Writing `telemetry.addData("seconds", seconds);` in `runOpMode` gives you `cannot find symbol`, which is the scope idea from Tier 0 lesson 03 arriving properly.

What gets passed is a copy of the value. Changing `seconds` inside the method does not touch the variable you called it with. That is worth knowing because it is the opposite of what happens with objects in lesson 05, where what you pass is a way of reaching the thing rather than the thing itself.

The cast is the mirror image of the `incompatible types` error from Tier 0. Java will widen an int into a double for free, because nothing is lost. Going the other way loses the decimal part, so it makes you say in writing that you meant it. `(long) 1.9` is `1`, not `2`: a cast cuts, it does not round. `Math.round` rounds.
:::

## Try

Write `driveForward` with a `double seconds` parameter, then call it three times with `1.0`, `0.5` and `1.5`.

## Check

The checks want a method called `driveForward` that takes one value, and the robot driving at least 180 cm in total. Three seconds at power `0.7` is about 210 cm.

## Boost

Add a second parameter so the method takes a power too: `driveForward(double seconds, double power)`. Then call it with `1.0, 0.3` and watch a slow move.
