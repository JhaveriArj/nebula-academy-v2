---
id: t5-checkpoint-real-robot
title: "Checkpoint: TeleOp and Auto pair"
tier: 5
minutes: 40
concept: One hardware class, two OpModes, and a checklist for the day you run it on metal.
robot: mecanum
explorerLockedRanges: [[1, 83]]
---

## Mission

The autonomous drives to the wall, turns square, closes the claw and prints the checklist for running it on a real robot.

## Watch

To the wall, a measured turn, the claw. Then the checklist appears in the console.

## Learn

This is the last one, and it is the shape of a real team's code.

One `Hardware` class holds the wiring. It is written for you at the bottom of the file, because you built it in lesson 04. Both OpModes use it, so both get the same reversals, the same sensors and the same helper methods.

The autonomous is two steps and a finish. Step one uses the distance sensor. Step two uses the **proportional control** turn from lesson 03. Then the claw closes and the checklist prints.

Your TeleOp is the other half of the pair. Java allows one public class per file, so it goes in its own file, `NebulaTeleOp.java`, next to this one. The code is in the Try section below, ready to copy.

The checklist is not padding. Every team that has damaged a robot skipped one of those five lines.

:::why
A pair sharing a hardware class is the point of the whole tier. When the drivetrain is rebuilt, one `init` changes and both OpModes keep working. When you find the claw's closed position is really `0.92`, you change it once.

Both halves also get the same bugs fixed. A team with the reversals copied into two files has twice the chance of driving backwards in one of them, and it is always the one that matters.

What you have now is genuinely the stack a competitive team uses: an annotated OpMode, a hardware abstraction, sensor-guided autonomous steps, proportional control on the turns, software limits on the mechanisms, and a git history. The remaining distance between this and a competition robot is not programming knowledge. It is build quality, driver practice and the twenty small numbers you can only tune against the real thing.

Go and tune them.
:::

## Try

Three TODOs: the wall approach, the proportional turn, and the claw plus the checklist.

Then copy this into `NebulaTeleOp.java` in your Android Studio project, beside this autonomous. It uses the same `Hardware` class, which in a real project lives in `Hardware.java`:

```java
@TeleOp(name = "Nebula TeleOp", group = "Nebula")
public class NebulaTeleOp extends OpMode {
    private Hardware robot = new Hardware();

    @Override
    public void init() {
        robot.init(hardwareMap);
    }

    @Override
    public void loop() {
        double drive = -gamepad1.left_stick_y;
        double strafe = gamepad1.left_stick_x;
        double turn = gamepad1.right_stick_x;

        robot.frontLeft.setPower(drive + strafe + turn);
        robot.frontRight.setPower(drive - strafe - turn);
        robot.backLeft.setPower(drive - strafe + turn);
        robot.backRight.setPower(drive + strafe - turn);

        if (gamepad1.a) {
            robot.closeClaw();
        }

        telemetry.addData("drive", drive);
        telemetry.update();
    }
}
```

## Check

The checks want the robot stopped about 25 cm from the wall, facing 90 degrees within a few degrees, the claw closed, and the checklist printed.

## Boost

Give both steps a timeout, so a dead sensor costs you one step and not the match. Then add a third step that drives to the blue tile, and run the whole thing twice to see whether it lands in the same place.
