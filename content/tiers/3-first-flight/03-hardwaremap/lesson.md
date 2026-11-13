---
id: t3-hardwaremap
title: Names and the hardware map
tier: 3
minutes: 25
concept: The name in your code has to match the name in the robot configuration, exactly.
robot: mecanum
explorerLockedRanges: [[1, 16]]
---

## Mission

Your program finds all four drive motors by name and tells the Driver Station the first one is ready.

## Watch

Still nothing moving. The motors are being found, which has to happen before anything can be told what to do.

## Learn

Your robot has four drive motors. Your program needs a way to reach them.

Someone has already given each one a name, in the robot configuration on the Driver Station. Your code asks for them by those names:

`frontLeft = hardwareMap.get(DcMotor.class, "frontLeft");`

Read the dot. `hardwareMap` is a thing the robot handed you. `get` is a method on it. You tell `get` two things: what kind of part you want, and what it is called.

`DcMotor.class` is how you name a kind rather than a thing. `"frontLeft"` is the name from the configuration.

The name has to match *exactly*, capital letters and all. `"frontleft"` is a different name, and asking for it stops the program with a message naming the part it could not find.

This belongs in `init`, because finding a motor is setting up. Do it once.

:::why
This is the single most common reason a working program stops working at a competition. Someone rebuilds the robot configuration, calls a motor `front_left` instead of `frontLeft`, and the code that ran all week throws on INIT.

Hardware names are also why `init` exists. `hardwareMap.get` is slow in robot terms, and doing it fifty times a second would be wasteful even though it would appear to work.

Notice what you get back. `DcMotor` is an interface, not a class: it says what any motor can do without saying how. What `get` actually hands you is a thing that talks to a motor controller over a wire, and your code neither knows nor cares. That is the point of an interface, and it is why the same `setPower` line works on every motor your team ever bolts on.

The fields are declared at the top and filled in during `init`. Between the program starting and `init` running they hold `null`, which is why using one too early gives you a `NullPointerException` naming the motor.
:::

## Try

Write the four `hardwareMap.get` lines in `init`. Then show `frontLeft : ready` on the Driver Station with `telemetry.addData("frontLeft", "ready");` followed by `telemetry.update();`.

Copy the first line and change the name in two places for each of the others. The variable name and the text in quote marks are the same word.

## Check

The checks want `frontLeft : ready` on the Driver Station. Your program only gets that far if every motor was really found, because a name that does not match stops it first.

## Boost

Change one of the names in quote marks to something wrong on purpose, press Run, and read what comes back. It tells you which names this robot does have.
