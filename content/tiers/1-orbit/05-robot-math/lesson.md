---
id: t1-robot-math
title: Robot math
tier: 1
minutes: 20
concept: The robot can work a number out instead of being told it, and int division throws the remainder away.
robot: tank
explorerLockedRanges: [[1, 19]]
---

## Mission

The robot works out for itself how long to drive to cover exactly 90 cm.

## Watch

The robot drives forward and stops after 90 cm. Nobody told it 1500 milliseconds; it worked that out.

## Learn

You can do math right where a number goes. These are the **operators**:

`+` add, `-` take away, `*` times, `/` divide, and `%` which gives the remainder.

At power `0.6` this robot covers 60 cm every second. So to drive `cm` centimetres:

`int driveMs = cm * 1000 / 60;`

With `cm` at 90 that works out to 1500, and `sleep(driveMs)` drives exactly 90 cm. Change `cm` to 120 and the robot works out the new time by itself.

Now the part that surprises people. `90 / 60` is `1`, not `1.5`. Both sides are `int`, so the answer has to be an `int`, and the half is thrown away. Not rounded. Thrown away.

`%` hands you what was thrown away. `90 % 60` is `30`.

If you want `1.5`, one side has to be a `double`: `90 / 60.0`.

:::why
This is the single most common silent bug in beginner FTC code, and it is silent because nothing goes wrong. No error, no warning, only an answer that is quietly too small.

The classic version is converting ticks to centimetres. Write `int cm = ticks / 17.8;` and Java stops you, because the right-hand side is a double. Write `int cm = ticks / 17;` and it runs happily, losing up to a centimetre every time, which over a long autonomous puts the robot in the wrong place with nothing to show you why.

The habit that saves you: when you are working with amounts rather than counts, write `60.0` instead of `60`. The `.0` costs nothing and makes the whole expression a double.

Note also the order. `cm * 1000 / 60` multiplies first, giving 90000, then divides, giving 1500. Written the other way round as `cm / 60 * 1000` it would do `90 / 60` first, get `1`, and tell the robot to drive for one second. Same numbers, same operators, 50 cm short.
:::

## Try

Fill in the four TODO lines. Work out `driveMs`, print the whole seconds and the left over, then use `driveMs` in the `sleep` line.

Press Run and watch where the robot stops.

## Check

The checks want the robot to finish 90 cm up the field, and the console to read `whole seconds: 1` and `left over: 30`.

## Boost

Change `cm` to 150 and press Run. Then work out what `cm / 60` and `cm % 60` will print before you look.
