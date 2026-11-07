---
id: t5-android-studio
title: Android Studio and the real SDK
tier: 5
minutes: 30
concept: The code you have been writing goes into a real project, unchanged.
robot: mecanum
explorerLockedRanges: [[1, 30]]
---

## Mission

You write the TeleOp you are going to put on your team's actual robot.

## Watch

The robot drives from the sticks and works its claw. This is the program you are about to move onto hardware.

## Learn

Everything you have written uses the real FTC packages and the real method names. Nothing here is a Nebula invention. That means the file in front of you goes into a real project with no changes at all.

Four steps to get there.

1. Install Android Studio. It is the free program teams use to write robot code, and your mentor will know which version this season needs.
2. Get the SDK: clone `FIRST-Tech-Challenge/FtcRobotController` from GitHub, the way you learned last lesson. That **repository** is the robot's software, and your code is one folder inside it.
3. Find the teamcode folder, at `TeamCode/src/main/java/org/firstinspires/ftc/teamcode`. That path is why every file you have written starts with `package org.firstinspires.ftc.teamcode;`.
4. Add your file: a new Java file whose name matches the class name exactly, then paste.

The full setup guide, with the version numbers for this season, is at [ftc-docs.firstinspires.org](https://ftc-docs.firstinspires.org).

:::why
Two things catch everyone out the first time.

The class name has to match the file name exactly. `TeamTeleOp.java` has to hold `public class TeamTeleOp`. Java is strict about this and the error message is clear once you know to expect it.

The robot configuration has to match your names. `hardwareMap.get(DcMotor.class, "frontLeft")` needs a motor called exactly `frontLeft` in the configuration on the Driver Station, which somebody sets up on the phone, not in the code. This is the number one reason a first upload does not run, and the error names the device it could not find.

What Nebula does not give you is the build. Android Studio will take a few minutes the first time, and it will want a specific Java version and a lot of disk. That is normal and your mentor has seen it before.

The thing to hold onto is that the hard part is behind you. Knowing what `loop` is for, why the right side is reversed and where to put a software limit is the part that takes six tiers. The tooling takes an afternoon.
:::

## Try

Write the TeleOp properly, as the thing you will paste: sticks into drive, strafe and turn, the mixing, the claw on A and B, and telemetry.

Then, away from this website, install Android Studio and clone the SDK. Bring your file with you.

## Check

The checks want the robot driving, strafing, and the claw closing, which is a TeleOp worth putting on a robot.

## Boost

Work out what your robot's configuration needs to be called for this file to run, and write the list down. Five names. That list is what someone types into the Driver Station.
