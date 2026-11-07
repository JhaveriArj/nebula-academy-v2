---
id: t2-dot-syntax
title: Reading the dot
tier: 2
minutes: 20
concept: A dot always means the same thing, whether the thing on the left is yours or the robot's.
robot: tank
explorerLockedRanges: [[1, 21]]
---

## Mission

The robot asks three different things a question, all with the same shape of line.

## Watch

The robot drives one short move. Everything else in this lesson is in the console.

## Learn

Look at these three lines:

```
reporter.describe()
"Nebula".toUpperCase()
leftDrive.getPower()
```

They have the same shape. A thing, a dot, a name, round brackets. Every one of them means: ask this thing to do that.

What is on the left changes. `reporter` is an object you built. `"Nebula"` is a String. `leftDrive` is a motor the robot handed you. The dot does not care. It reaches inside whatever is on its left and finds the method named on its right.

A dot can also reach a field, with no brackets: `reporter.team` is the field, `reporter.describe()` is the method. Brackets mean "do this". No brackets means "the value stored here".

So you have already been reading objects all along:

`hardwareMap.get(DcMotor.class, "leftDrive")`

A thing called `hardwareMap`, a dot, and a method called `get`. Next tier, that line stops being magic.

:::why
This is why Tier 2 comes before the FTC SDK. Nearly every line of real robot code is a dot: `telemetry.addData(...)`, `imu.resetYaw()`, `armMotor.setTargetPosition(500)`. A kid who has built their own class and called their own method reads all of those the same way, and a kid who has not is copying shapes.

Something worth noticing: `"Nebula".toUpperCase()` hands back a new String and leaves the old one alone. Strings in Java never change once made. `name.toUpperCase();` on its own line does nothing useful, because the answer went nowhere. You have to catch it: `name = name.toUpperCase();`

And `leftDrive.getPower()` asks the motor what it is doing right now. Methods are not only for commands; they are how one object answers another's question. That is the whole of reading a sensor, which is Tier 4.
:::

## Try

Four TODOs. Write the `describe` method on `Reporter`, then print three things: what the reporter says, the team name in capitals, and the motor's power while it is driving.

## Check

The checks want `team Nebula`, `NEBULA`, and the motor's power in the console, plus the robot moving.

## Boost

Add `String shout()` to `Reporter` that returns `describe().toUpperCase()`. One method calling another, with a dot on the answer.
