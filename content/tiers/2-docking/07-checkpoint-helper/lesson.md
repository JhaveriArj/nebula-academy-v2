---
id: t2-checkpoint-helper
title: "Checkpoint: robot helper class"
tier: 2
minutes: 30
concept: Put the whole tier together. One class that knows how to drive, used from three lines.
robot: tank
explorerLockedRanges: [[1, 21]]
---

## Mission

The robot drives forward, turns left, and drives forward again, from three lines that read like English.

## Watch

Forward, a left turn, forward again. Watch how little the program that did this has to say.

## Learn

Everything in this tier, in one class.

`Robot` has three **field**s: the two motors and the OpMode. Its **constructor** fills them in. Then each move gets a **method** with a name.

The fields are the new part. A `Robot` cannot reach `leftDrive` by itself, so it is handed the motors when it is built:

`Robot robot = new Robot(leftDrive, rightDrive, this);`

`this` means the OpMode you are in. The `Robot` needs it because `sleep` belongs to the OpMode, not to your class, so inside `Robot` you write `opMode.sleep(785)`.

Once that is done, the mission reads like this:

```
robot.driveForward(2.0);
robot.turnLeft();
robot.driveForward(1.0);
```

Three lines. A teammate can read them in the pit between matches and know what the robot will do.

:::why
What you have written here is a hardware class, and it is how competitive FTC teams actually organise code. Tier 5 lesson 04 builds the proper version, shared between a TeleOp and an autonomous so both drive the same way.

Handing the motors in rather than reaching for them is called passing in a dependency, and it is why `Robot` could be given different motors without changing a line inside it. It is also why `stopMoving()` can be called from the other three methods with no dot in front: inside the class, its own methods are already in reach.

The reason `this` has to be passed is worth sitting with. `sleep` is not a Java keyword; it is a method on `LinearOpMode`. Your `Robot` class is not a `LinearOpMode`, so it has no `sleep` of its own, and the only way to reach one is to hold a reference to something that does. That is the dot from lesson 06 doing real work.
:::

## Try

Write the three methods inside `Robot`, then drive the mission from `runOpMode`.

All three end by calling `stopMoving()`, which is already written for you.

## Check

The checks want a class called `Robot` with `driveForward`, `turnLeft` and `turnRight`, the robot driving at least 150 cm, turning about 90 degrees, and finishing up and to the left of where it started.

## Boost

Add `driveBackward(double seconds)` and use it to bring the robot home at the end. Then try writing the whole mission as a loop that drives a square using `driveForward` and `turnRight`.
