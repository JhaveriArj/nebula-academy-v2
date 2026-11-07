---
id: t0-hello-robot
title: Hello, robot
tier: 0
minutes: 10
concept: The code already drives the robot. Change one number and it drives further.
robot: tank
explorerLockedRanges: [[1, 19], [22, 26]]
---

## Mission

The robot drives forward, and you decide how far.

## Watch

The robot starts at the bottom of the field and drives straight up it, then stops. Keep an eye on how long it keeps going.

## Learn

When you press **Run**, the robot does what your code says, one line at a time, from the top.

Two lines matter here.

`leftDrive.setPower(0.5);` tells the left wheel how fast to spin. **Power** runs from `-1.0`, which is full speed backwards, to `1.0`, which is full speed forwards. So `0.5` is half speed.

`sleep(1000);` tells the robot to keep doing that for 1000 **milliseconds**. That is one second. Nothing changes while it sleeps, so the wheels keep spinning.

Then both powers go back to `0` and the robot stops.

Make the `1000` bigger and the robot drives for longer. That is the whole trick: the numbers in your code decide what the robot does.

:::why
`sleep` blocks. While the robot waits, it is not checking anything at all. That is fine for one straight move and a problem later on, because an autonomous that sleeps cannot notice a wall in front of it. Tier 4 swaps `sleep` for a timed loop that keeps looking.

Power is also not the same thing as speed. `setPower(0.5)` asks for half of the motor's output, and what that turns into on the field depends on the battery, the floor and the weight of the robot. In this simulator full power is 100 cm every second for the tank robot, so half power for one second is about 50 cm. The same code on your real robot will travel a different distance, which is exactly why Tier 4 teaches encoders.
:::

## Try

Find `sleep(1000);` and change `1000` to `2000`. Press Run.

The robot should drive about twice as far. Watch the field while it goes.

## Check

The checks want the robot to drive at least 80 cm. One second of half power gets it about 50 cm, so `1000` is not enough. Make the number bigger.

## Boost

Try `sleep(3000)`. Then put the number back to `2000` and change both `0.5` values to `0.25` instead. Does the robot travel the same distance? Why not?
