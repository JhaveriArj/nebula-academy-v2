---
id: t2-first-method
title: Teaching the robot a trick
tier: 2
minutes: 20
concept: A method gives one name to a whole group of instructions.
robot: tank
explorerLockedRanges: [[1, 19]]
---

## Mission

The robot drives a square from four lines of code that each say the same thing.

## Watch

The same square again. This is the third time you have built it, and this time the code says what it means.

## Learn

Last tier you put the square in a loop. A **method** goes further: it gives the whole move a name.

```
private void driveOneSide() {
    leftDrive.setPower(0.6);
    ...
}
```

Read it in parts. `private` means only this class uses it. `void` means it hands nothing back. `driveOneSide` is the name you chose. The empty `()` means it needs nothing from you.

Writing a method does not run it. To run it, **call** it by name:

`driveOneSide();`

Four of those lines and the robot drives a square. Someone reading your program sees four sides, not forty lines of motor powers.

Notice `leftDrive` is now written near the top of the class instead of inside `runOpMode`. That is what lets the method reach it.

:::why
This is the single biggest step in the tier, because it changes what your program is. Up to now it has been a list of instructions. Now it is a set of named things the robot can do, and `runOpMode` is where you choose which ones to use.

That matters for FTC specifically. A competition autonomous that reads `driveToWall(); turnToGoal(); release();` can be understood, changed and debugged by a teammate in the pit between matches. The same thing written as sixty lines of `setPower` and `sleep` cannot, even by the person who wrote it.

The word `void` is worth noticing now, because next lesson but one you will replace it. `void` means this method does its work and hands nothing back. A method that works something out, like how many milliseconds a distance needs, has to hand the answer back, and then `void` becomes `int`.
:::

## Try

Two TODOs. Write the method underneath `runOpMode`, then call it four times inside `runOpMode`.

Careful with the braces. The method sits inside the class but outside `runOpMode`, so it goes after the `}` that closes `runOpMode` and before the last `}` of the file.

## Check

The checks want a method called `driveOneSide`, the robot driving the whole square, and it finishing back near the start.

## Boost

Split the method in two: `driveForwardOneSide()` and `turnLeft()`. Then call them alternately. Which version reads better?
