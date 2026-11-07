---
id: t1-decimals
title: Numbers with a point
tier: 1
minutes: 15
concept: Motor power needs numbers between 0 and 1, and an int cannot hold those.
robot: tank
explorerLockedRanges: [[1, 16]]
---

## Mission

The robot drives at a speed you choose, somewhere between stopped and full tilt.

## Watch

The robot drives across the field at a middling pace. Not crawling, not flat out.

## Learn

An **int** holds whole numbers only. Try `int speed = 0.6;` and Java refuses, because `0.6` is not whole.

Motor power lives between `-1.0` and `1.0`, so almost every useful power has a point in it. For those you need a **double**:

`double speed = 0.6;`

A double holds numbers with a decimal point. Same shape as before: kind, name, value.

Watch what the two kinds do to division. `3 / 2` with ints gives `1`, because an int cannot hold the half, so it gets thrown away. `3.0 / 2` gives `1.5`. The kind you pick changes the answer, not only how it looks.

So: whole things you can count, like sides of a square, want `int`. Amounts, like power and seconds, want `double`.

:::why
A double stores a number as a sign, a set of digits and a power of two, which is why it holds a wide range of values but cannot hold all of them exactly. `0.1 + 0.2` comes out as `0.30000000000000004`, in Java as in nearly every other language.

That sounds alarming and almost never matters here, because nothing in FTC needs more than two or three digits of precision: a motor cannot tell `0.600` from `0.6004`. Where it does matter is comparing doubles with `==`. Asking whether a heading is exactly `90.0` can be false even when the screen says it is, so FTC code asks whether the difference is small instead, which is what Tier 4 does when it turns to an angle.

`setPower` takes a double, and that is why `setPower(1)` works: Java widens the int `1` into the double `1.0` for you. It will never narrow the other way without being asked, which is the `incompatible types` error from Tier 0.
:::

## Try

Make a `double` called `speed` holding `0.6`, print it, and use it in both `setPower` lines in place of `0.0`.

Press Run. A power of `0.0` means stopped, so right now the robot goes nowhere.

## Check

The checks want a number with a decimal point in the console, and the robot driving at least 60 cm.

## Boost

Try `0.2`, then `1.0`. Then write `int speed = 0.6;` on purpose and read the error, because you will meet it again.
