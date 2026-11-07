---
id: t3-gamepad-sticks
title: Driving by hand
tier: 3
minutes: 25
concept: A stick gives a number from -1 to 1, and pushing forward gives a negative one.
robot: mecanum
explorerLockedRanges: [[1, 27]]
---

## Mission

The robot drives forward while the stick is pushed forward, and stops the moment it is let go.

## Watch

The stick goes forward and the robot goes forward. Let go and it stops. This is the first lesson where a person is driving.

## Learn

The **gamepad** is a field your OpMode already has. `gamepad1` is the first driver's controller.

A stick gives you a number:

`gamepad1.left_stick_y`

Centred it reads `0.0`. All the way over it reads `1.0` or `-1.0`. In between you get everything in between, which is what makes a stick better than a button.

Now the part that catches everyone. Pushing the stick *forward* gives a *negative* number. That is how game controllers have always worked: down the screen is positive. So driving forward needs a minus sign:

`double drive = -gamepad1.left_stick_y;`

Push forward, `left_stick_y` is `-1.0`, `drive` is `1.0`, and the robot goes forwards.

Reading the stick belongs in `loop`, because the driver keeps moving it. Reading it in `init` would catch the stick once before the match and drive on that forever.

:::why
The minus sign is the most copied line in FTC and the least understood. It is not a bug in the SDK or a quirk of your robot; it is a convention inherited from screen coordinates, where y counts downwards from the top.

The sticks are also noisy. A controller at rest often reads `0.01` rather than `0.0`, and a robot that creeps across the field while nobody touches anything is usually this. Teams add a deadband:

```
if (Math.abs(drive) < 0.05) {
    drive = 0;
}
```

Worth knowing too: `left_stick_y` is a `float`, not a `double`. Java widens it for you, so `double drive = -gamepad1.left_stick_y;` is fine, and this is the widening from Tier 1 lesson 02 quietly doing its job.

The last thing drivers notice is that full power is twitchy. Many teams square the stick value, keeping the sign, so small pushes give fine control and the top end is still full speed.
:::

## Try

Make a `double` called `drive` from `gamepad1.left_stick_y` with a minus sign in front, then give all four motors that power.

The checks push the stick for you, so you do not need a controller plugged in.

## Check

The checks want the robot driving at least 80 cm and still facing forwards.

## Boost

Take the minus sign off and press Run. Which way does the robot go? Then add the deadband from the panel above and see whether the robot sits more still.
