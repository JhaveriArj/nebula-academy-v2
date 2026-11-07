---
id: t4-encoders
title: Counting the wheels
tier: 4
minutes: 30
concept: An encoder measures how far a wheel turned, so the robot can drive a distance instead of a length of time.
robot: mecanum
explorerLockedRanges: [[1, 28]]
---

## Mission

The robot drives exactly one metre, measured by its own wheels rather than a stopwatch.

## Watch

The robot drives up the field and stops. Watch the tick count climb on telemetry and the robot stop when it arrives.

## Learn

Every move so far has been timed. Timed moves drift: a fresh battery drives further than a flat one, and carpet is slower than tile.

An **encoder** counts how far a motor has actually turned, in **tick**s. On this robot one centimetre is about 17.8 ticks, so a metre is about 1780.

Four steps:

```
frontLeft.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);
frontLeft.setTargetPosition(target);
frontLeft.setMode(DcMotor.RunMode.RUN_TO_POSITION);
frontLeft.setPower(0.5);
```

Zero the count, say where to stop, switch the motor into the mode that drives to a target, then give it a power. In `RUN_TO_POSITION`, power means "how fast to get there" rather than "which way to go". The motor stops itself on arrival.

`isBusy()` is `true` while a motor is still travelling, so the robot waits like this:

`while (opModeIsActive() && frontLeft.isBusy()) { ... }`

:::why
`RUN_TO_POSITION` is the motor controller doing the work. It compares the target to the count hundreds of times a second and adjusts, far faster than your `loop` could, which is why it holds position so well when something shoves the robot.

The number 17.8 comes from the hardware: these motors give 537.7 ticks per turn, and the wheel is 9.6 cm across, so 30.16 cm around. 537.7 divided by 30.16 is 17.83. Change a wheel or a gearbox and that number changes, which is why teams keep it in one named constant rather than sprinkling it through the code.

Watch the integer division trap from Tier 1 lesson 05. `(int) (100 * 17.8)` is 1780. Written `100 * 178 / 10` it is also 1780, but `100 / 10 * 178` is 1780 too and `100 * (178 / 10)` is 1700, which is 4.5 cm short.

Waiting on one motor is a simplification. Real code checks all four, because a wheel that slips arrives late and the robot ends up crooked.
:::

## Try

Three TODOs. Set the target on all four, switch all four to `RUN_TO_POSITION`, give them power, wait while `frontLeft` is busy showing the tick count, then stop.

## Check

The checks want the robot one metre up the field, having driven at least 90 cm, with telemetry showing `ticks`.

## Boost

Change `target` to drive 50 cm instead, and check it lands where you expect. Then make the loop wait while *any* of the four is busy, using `||`.
