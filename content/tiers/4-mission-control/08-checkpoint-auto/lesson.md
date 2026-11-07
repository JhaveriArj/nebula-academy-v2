---
id: t4-checkpoint-auto
title: "Checkpoint: full autonomous"
tier: 4
minutes: 40
concept: Put the whole tier together. Three sensor-guided steps, one after the other.
robot: mecanum
explorerLockedRanges: [[1, 42]]
---

## Mission

The robot drives to the wall, turns square, finds the blue tile and parks on it, with nobody driving.

## Watch

Up the field, stop short of the wall, turn ninety degrees, then across to the blue tile and stop. Three steps, all guided by sensors.

## Learn

Everything in this tier, in order. Each step is the same shape:

```
while (opModeIsActive() && <not there yet>) {
    ... keep going ...
}
park();
```

Step one uses the distance sensor: keep driving while there is more than 20 cm in front.

Step two uses the **IMU**: keep spinning left while the **yaw** is under 90.

Step three uses the colour sensor: keep driving while blue is still no higher than red.

Each loop ends by parking, so the robot is stopped before the next step starts. Without that, the wheels keep their last power into the following step and the robot drifts while it turns.

The five helper methods at the bottom are written for you. They are Tier 2 doing its job: `drive(0.4)` says what it means, where four `setPower` lines would not.

:::why
Three loops in a row is a chain, and a chain breaks at its weakest link. If step one's sensor never reads under 20, the robot never reaches step two, and your autonomous scores nothing while looking like it is working.

That is why every step in competition code carries a timeout:

```
timer.reset();
while (opModeIsActive() && timer.seconds() < 4.0 && cmAhead() > 20) {
```

Four seconds, then move on whatever the sensor says. A partial autonomous beats a stuck one.

The deeper problem with a chain is that it cannot react. Once the robot is in step two it has no opinion about the wall any more. A TeleOp-style state machine keeps every step's conditions live at once, deciding each pass which step it is in, and that is Tier 5 lesson 02.

Notice also that `park()` between steps exists because a motor holds its last command. Your code moved on; the motors did not hear about it. That single fact causes more confusing autonomous behaviour than any sensor.
:::

## Try

Three TODOs, one per step. Each is a `while` loop with the right condition, the right helper inside it, telemetry showing which step is running, and a `park()` afterwards.

Build step one and press Run before writing step two.

## Check

The checks want the robot facing 90 degrees, parked on the blue tile, having driven more than 280 cm, inside 30 seconds, with telemetry reporting each step.

## Boost

Add the timeout from the panel above to all three steps. Then make step three turn back to 0 degrees before parking, so the robot finishes square to the field.
