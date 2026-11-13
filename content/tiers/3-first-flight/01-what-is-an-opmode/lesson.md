---
id: t3-what-is-an-opmode
title: What an OpMode is
tier: 3
minutes: 20
concept: An OpMode is a program the Driver Station runs, and the robot calls your code rather than the other way round.
robot: mecanum
explorerLockedRanges: [[1, 12]]
---

## Mission

Your program reports once that it is ready, then counts how many times the robot asks it for instructions.

## Watch

The robot sits still. This lesson is about the shape of the program, and the field stays quiet.

## Learn

Everything so far started at the top and ran to the bottom. A real robot program does not work that way.

An **OpMode** is a program the Driver Station can run. You write a class that `extends OpMode`, and the robot calls your code when it needs it:

`init()` runs once, the moment the driver presses INIT.

`loop()` runs over and over, about fifty times a second, from the moment they press PLAY until they press STOP.

`stop()` runs once at the end.

You do not call these. The robot does. Your job is to fill them in.

`@TeleOp` above the class is how the Driver Station finds it. Without that line your OpMode does not appear in the list on the driver's phone.

Notice `loops` is a **field**, not a local variable. A local variable inside `loop()` would be rebuilt from scratch every time. A field survives.

:::why
This is called an inversion of control, and it is the thing that makes robot code feel different from everything before it. You hand the robot a set of methods and the robot decides when to run them.

The practical consequence is that `loop()` must always finish quickly. It is called fifty times a second, so anything slow inside it stops the robot responding to the driver. That is why `sleep()` has no place in a TeleOp: a half-second sleep means a half-second where the sticks do nothing, and the robot feels broken.

That is also why anything the program needs to remember has to be a field. A TeleOp has no single run from top to bottom in which a local variable could live. The whole of Tier 5's state machine exists because of this one fact.

The Tier 4 autonomous uses `LinearOpMode` instead, which does run top to bottom, because an autonomous really is a list of moves. Both are OpModes; they differ in who is in charge of the order.
:::

## Try

Two TODOs. Show `Nebula ready` on the Driver Station in `init`, with `telemetry.addData("Status", "Nebula ready");` and then `telemetry.update();`. Add one to `loops` in `loop`.

Press Run. `stop()` is already written and shows the total at the end.

## Check

The checks want `Status : Nebula ready` on the Driver Station and a count of more than ten loops at the end.

## Boost

Add `telemetry.addData("loops", loops);` and `telemetry.update();` to `loop()` as well, and press Run. Watch the number climb: that is how often the robot is asking your code what to do.
