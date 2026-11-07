---
id: t3-checkpoint-teleop
title: "Checkpoint: mecanum TeleOp"
tier: 3
minutes: 35
concept: Put the whole tier together. A TeleOp a driver could take to a match.
robot: mecanum
explorerLockedRanges: [[1, 39]]
---

## Mission

One driver drives, slides sideways, spins, lifts the arm and works the claw, all from one controller.

## Watch

Forward, then sideways without turning, then a spin on the spot, then the arm and claw. That is a full TeleOp.

## Learn

Three sticks give three wishes. The driver wants to go forward, slide sideways, and spin, possibly all at once. Four wheels have to deliver all three.

The **mecanum** mixing is four lines:

```
frontLeft.setPower(drive + strafe + turn);
frontRight.setPower(drive - strafe - turn);
backLeft.setPower(drive - strafe + turn);
backRight.setPower(drive + strafe - turn);
```

Look at the signs rather than learning them by heart. `drive` is added to all four, so every wheel pulls the same way going forward. `strafe` is positive on the two wheels that push the robot right and negative on the two that push it left. `turn` is positive on the left pair and negative on the right pair, which is a spin.

Set all three to zero and every wheel gets zero. Set only `strafe` and the robot slides sideways without turning, which is the thing mecanum is for.

The arm uses the triggers, which give `0.0` to `1.0` rather than true or false, so subtracting one from the other gives you up, down and stopped from two fingers.

:::why
Those three numbers can add up past `1.0`. Full `drive` plus full `strafe` plus full `turn` asks `frontLeft` for `3.0`, and the motor can only give `1.0`, so it gives `1.0` while `frontRight` is asked for `-1.0` and gives that. The ratios between the wheels are wrong, and the robot does not go where the driver aimed.

Real teams fix it by scaling instead of clipping:

```
double max = Math.max(Math.abs(drive) + Math.abs(strafe) + Math.abs(turn), 1.0);
frontLeft.setPower((drive + strafe + turn) / max);
```

Dividing all four by the same number keeps the ratios and so keeps the direction, giving up only top speed. That is the single change that makes a mecanum robot feel good to drive, and it is a worthwhile Boost.

The claw uses `if` / `else if` rather than two separate `if`s on purpose. With two, holding A and B together sets the position twice in one pass, and the second one wins. With `else if`, A beats B and the behaviour is predictable.
:::

## Try

Four TODOs: the mecanum mixing, the arm on the triggers, the claw on A and B, and telemetry for all three stick values.

The checks drive the controller for you.

## Check

The checks want the robot to drive forward, slide sideways, spin, lift the arm, close the claw, and report `drive` on telemetry.

## Boost

Add the scaling from the panel above so full diagonal still drives true. Then make the arm stop at the top by refusing to go up past 1100 encoder ticks.
