---
id: t1-first-variable
title: Your first variable
tier: 1
minutes: 15
concept: A variable is a name that holds a number, so you change the number in one place.
robot: tank
explorerLockedRanges: [[1, 16]]
---

## Mission

The robot makes the same move twice, using one number you can change in one place.

## Watch

The robot drives, pauses, and drives again. Both moves last the same time, because both come from the same number.

## Learn

This program drives twice, and `1000` is written twice. If you want both moves longer, you have to change it in two places. Miss one and the robot does something lopsided.

A **variable** fixes that. It is a name that holds a value:

`int driveTime = 1500;`

Read it from the right. `1500` is the value. `driveTime` is the name you picked. `int` says what kind of value it holds: an **int** is a whole number, with no decimal point.

Now you write `sleep(driveTime)` instead of `sleep(1000)`. The robot looks up the name and finds 1500. Change the number once, at the top, and both moves change together.

Pick names that say what they hold. `driveTime` tells you something. `x` does not.

:::why
`int` is a 32-bit whole number, which means it holds anything from about minus two billion to plus two billion. Nothing here goes near that, but it matters later: an encoder counting ticks through a long autonomous stays comfortably inside an int, which is why FTC code uses `int` for tick counts.

The word `int` is doing real work, not decoration. Java wants to know the kind of every value before the program runs, so it can catch you putting text in a number box while it reads your file rather than halfway through a match. That is the same check that produced `incompatible types` in Tier 0 lesson 03.

One name, one place to change it, is the first version of an idea this whole tier is built on. Tier 2 turns it into a method, where a whole group of instructions gets one name.
:::

## Try

Write the two TODO lines. Make `driveTime` hold `1500`, print it, then use `driveTime` in both `sleep` lines instead of `1000`.

Press Run. Both moves should be longer than before.

## Check

The checks want `1500` in the console and the robot travelling at least 140 cm in total. Two moves of 1500 milliseconds at half power is about 150 cm.

## Boost

Change `1500` to `2500`, at the top only. Did both moves get longer? Now add a third move that also uses `driveTime`.
