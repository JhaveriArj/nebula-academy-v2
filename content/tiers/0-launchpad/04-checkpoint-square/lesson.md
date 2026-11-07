---
id: t0-checkpoint-square
title: "Checkpoint: square and signature"
tier: 0
minutes: 20
concept: Put the whole tier together. Drive a square, then sign your work.
robot: tank
explorerLockedRanges: [[1, 15]]
---

## Mission

The robot drives a square and comes back to where it started, then prints your name three times.

## Watch

The robot drives one side, turns left, and does that four times until it is back where it began. Count the turns.

## Learn

A square is one move repeated. Drive forward, turn left, and do both of those four times.

Driving forward is the pair of lines you already know: both wheels the same power, then `sleep`, then both wheels back to `0`.

Turning is almost the same, except the wheels go opposite ways. One wheel forward and one wheel backward makes the robot spin where it stands instead of going anywhere. `leftDrive.setPower(-0.5);` with `rightDrive.setPower(0.5);` turns it to the left.

How long to spin? On this robot, `785` milliseconds at those powers is a quarter turn, which is what a square corner needs. Four quarter turns is one full turn, which is why the robot ends up facing the way it started.

:::why
Where does 785 come from? The wheels sit 50 cm apart, and half power moves each one at 50 cm per second in opposite directions. Spinning like that turns the robot at about 115 degrees every second, so 90 degrees takes 90 divided by 115, which is 0.785 of a second.

Copying the same eleven lines four times should annoy you, and that is the point. You will write this again in Tier 1 with a loop, and once more in Tier 2 as a method called `turnLeft()`. The code gets shorter each time while the robot does exactly the same thing.

It is also fragile. Timed turns drift with battery charge, floor grip and robot weight, so a real square made this way slowly stops being square. Tier 4 fixes that properly with the IMU, which measures the angle instead of guessing at it from a stopwatch.
:::

## Try

The starter has four TODO comments telling you exactly what to write. Build one side and one turn first, press Run, and watch the robot do a quarter of the square.

Once that works, copy those lines three more times. Then print your own name three times at the end.

## Check

The checks want the robot to drive at least 200 cm in total, turn four corners, finish back near the start, and print the same name three times.

## Boost

Make it a triangle instead. Three sides, and each corner is a third of a full turn rather than a quarter. How many milliseconds is that?
