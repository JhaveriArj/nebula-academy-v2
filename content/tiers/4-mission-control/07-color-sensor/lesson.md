---
id: t4-color-sensor
title: Reading the floor
tier: 4
minutes: 25
concept: A colour sensor reads the tile under the robot, so the robot can find a place rather than count its way there.
robot: mecanum
explorerLockedRanges: [[1, 24]]
---

## Mission

The robot creeps forward until it notices it is standing on the blue tile.

## Watch

The robot creeps across grey tiles and stops the moment it reaches the blue one.

## Learn

A colour sensor points at the floor and reports how much red, green and blue it sees:

```
colorSensor.red()
colorSensor.green()
colorSensor.blue()
```

Each hands back an `int`. Bigger means more of that colour.

The useful trick is comparing them rather than looking for an exact value. A grey tile reads roughly the same on all three. A blue tile reads much higher on blue than on red. So:

`colorSensor.blue() > colorSensor.red()`

That is `true` on blue and `false` on grey, in bright light or dim, which an exact number would not be.

Turn it round to keep driving while you have *not* arrived:

```
while (opModeIsActive() && colorSensor.blue() <= colorSensor.red()) {
    ... creep forward ...
}
```

Creep rather than charge. A sensor reads about fifty times a second, so at full speed the robot crosses a tile edge having barely noticed.

:::why
Comparing channels instead of matching values is the single most useful habit with this sensor. Competition venues have skylights, stage lighting and photographers' flashes, and a threshold tuned in your workshop will not survive any of them. A ratio between two channels drifts far less than either channel alone.

For trickier jobs there is `NormalizedColorSensor`, which scales every channel to between 0 and 1 and lets you set a gain, so you can compare readings taken under different lights.

The creeping speed is a real constraint, not caution. The sensor is read once per pass of the loop, about every 20 milliseconds. At 120 cm a second that is 2.4 cm between readings, so the robot can be well past a line before it sees it. At 36 cm a second it is 0.7 cm. Teams that need accuracy drive slowly for the last stretch, which is the same ease-off idea as the next tier's proportional control.
:::

## Try

Write the loop. Creep forward at `0.3` while blue is not more than red, showing `blue` on telemetry, then stop and report `blue` under the key `tile`.

## Check

The checks want the robot to stop on the blue tile, having moved at least 40 cm, with telemetry showing both `blue` and `tile`.

## Boost

Make it look for the red tile instead by comparing `red()` against `blue()`. Then show all three channels on telemetry at once and drive across the field watching them change.
