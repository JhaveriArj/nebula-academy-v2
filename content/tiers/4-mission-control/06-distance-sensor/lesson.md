---
id: t4-distance-sensor
title: Stopping before the wall
tier: 4
minutes: 25
concept: A sensor reading in a loop condition lets the robot stop when it arrives rather than when the clock says so.
robot: mecanum
explorerLockedRanges: [[1, 25]]
---

## Mission

The robot drives at the wall and stops twenty centimetres short of it.

## Watch

The robot drives the length of the field and stops short of the wall. Watch the reading fall on telemetry.

## Learn

Up to now the robot has decided when to stop from a clock or a tick count. Both are guesses made before the match.

A sensor is a reading taken during it:

`distanceSensor.getDistance(DistanceUnit.CM)`

That hands back how far away the nearest thing in front is, as a double. You say which unit you want, so nobody has to wonder whether 20 means centimetres or inches.

Put it in the loop condition and the robot stops on arrival:

```
while (opModeIsActive() && distanceSensor.getDistance(DistanceUnit.CM) > 20) {
    ... drive ...
}
```

Read that as: while there is more than 20 cm in front, keep going. The moment there is not, the loop ends and the robot stops.

This is the first program that would still work if someone moved the wall.

:::why
Sensors lie sometimes. A distance sensor reads the nearest thing in its cone, which might be a game element, a referee's foot, or nothing at all if it is aimed over the top of the wall. Out of range, these return a very large number, so a condition written `> 20` keeps driving, which is the safe direction to fail in. Written `< 20` to mean "stop when far" it would never start.

Real code pairs the sensor with a timeout, exactly as lesson 03 showed:

```
while (opModeIsActive() && timer.seconds() < 4.0
        && distanceSensor.getDistance(DistanceUnit.CM) > 20) {
```

Stop when you arrive, or after four seconds, whichever comes first. One line, and a sensor failure costs you the rest of your autonomous instead of your robot.

Note the reading is taken fresh each pass of the loop. Storing it in a variable before the loop and testing that would check the same stale number forever, which is the frozen-boolean trap from Tier 1 lesson 03 in its most expensive form.
:::

## Try

Write the loop. Drive forward at `0.4` while the sensor reads more than 20 cm, showing the reading under the key `cm`, then stop.

## Check

The checks want the robot to end up about 20 cm from the wall, having driven at least 200 cm, with telemetry showing `cm`.

## Boost

Change `20` to `60` and watch it stop earlier. Then add the four-second timeout from the panel above.
