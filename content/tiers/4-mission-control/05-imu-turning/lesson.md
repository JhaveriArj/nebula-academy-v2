---
id: t4-imu-turning
title: Turning to an angle
tier: 4
minutes: 30
concept: The IMU measures which way the robot is facing, so a turn can aim at an angle rather than a time.
robot: mecanum
explorerLockedRanges: [[1, 30]]
---

## Mission

The robot turns until it is facing ninety degrees left, and knows when to stop.

## Watch

The robot spins on the spot and stops square. Watch the yaw reading climb towards ninety.

## Learn

Timed turns are the least reliable thing in an autonomous. A turn that was ninety degrees in the pit is a hundred and ten on a fresh battery.

The **IMU** lives inside the Control Hub and measures which way the robot is facing. Reading it:

```
imu.getRobotYawPitchRollAngles().getYaw(AngleUnit.DEGREES)
```

Read the dots. Ask the IMU for its angles, then ask those angles for the **yaw**, in degrees. Yaw counts up when the robot turns left and down when it turns right.

`imu.resetYaw()` makes whichever way the robot is facing count as zero. Call it after `waitForStart` so the match starts at zero.

Now a turn can aim at an angle:

```
while (opModeIsActive() && imu...getYaw(AngleUnit.DEGREES) < 90) {
    ... spin left ...
}
```

The robot spins while it has not arrived, and stops when it has. Battery, carpet and robot weight stop mattering.

:::why
Yaw is reported between -180 and 180, which means it wraps. Turning left past 180 does not give you 181; it gives you -179. A loop written `while (yaw < 190)` never finishes, and this is the most common autonomous hang there is.

Teams handle it by working with the difference between where they are and where they want to be, folded back into that range, rather than with the raw reading.

The other thing to notice is overshoot. At power `0.3` the robot turns about 50 degrees a second, and the loop checks 50 times a second, so it stops within about a degree. At `0.9` it would be nearer three degrees past, and then the robot's own weight carries it further. That is what the next tier's proportional control is for: ease off as you get close rather than running full tilt into the target and hoping.

`imu.initialize` with the hub orientation is in the locked part above. It tells the IMU which way the Control Hub is bolted on, because otherwise it cannot know which axis is yaw.
:::

## Try

Write the loop. Spin left while the yaw is under 90, showing the yaw on telemetry, then stop.

The reading is a long line. Splitting it across two lines is fine; Java does not mind.

## Check

The checks want the robot facing 90 degrees within a few degrees, and telemetry showing `yaw`.

## Boost

Change `90` to `-90` and work out why the robot now spins forever. Then fix it by swapping the four powers and the comparison.
