---
id: t1-if-else
title: Making a choice
tier: 1
minutes: 20
concept: An if lets the robot pick between two sets of instructions.
robot: tank
explorerLockedRanges: [[1, 20]]
---

## Mission

The robot checks whether there is room ahead and only drives if there is.

## Watch

The robot checks, decides there is room, and drives. Watch the console say so before it moves.

## Learn

Everything so far has run top to bottom, every line, every time. An **if** changes that.

```
if (distanceToWall > 100) {
    System.out.println("Driving");
} else {
    System.out.println("Too close");
}
```

The part in the round brackets is the **condition**. It has to be a boolean, which is why you learned those. If it is true, the robot runs the first block. If it is false, it runs the `else` block instead. Never both.

The curly braces mark where each block starts and stops. Everything inside the first `{ }` happens only when the condition is true.

You can leave the `else` off. Then nothing extra happens when the condition is false.

This is where a program stops being a list and starts being a decision.

:::why
Three mistakes to watch for, all of which compile and run.

Using one `=` instead of `==`. In Java this usually refuses to compile, because `distance = 100` gives you a number and `if` wants a boolean, so you get `incompatible types: double cannot be converted to boolean`. In some other languages it quietly assigns and carries on, so Java is doing you a favour.

Forgetting the braces. `if (x > 1) System.out.println("a"); System.out.println("b");` is legal, and only the first line belongs to the `if`. The second one always runs. Always use braces, even for one line.

Putting a semicolon after the condition: `if (x > 1);` ends the `if` right there with an empty body, and the block after it runs every time. The compiler cannot help, because that is a real thing to write.

The pattern `if` plus a sensor reading is the whole of autonomous. Tier 4 is this lesson with `distanceToWall` coming from an actual sensor rather than a number you typed.
:::

## Try

Write the `if` and the `else`. When `distanceToWall` is more than 100, print `Driving` and drive forward for 2000 milliseconds at power `0.6`. Otherwise print `Too close`.

Press Run. Then change `distanceToWall` to `50.0` and press Run again. The robot should stay still.

## Check

The checks want `Driving` in the console and the robot travelling at least 100 cm, so leave `distanceToWall` at 150 before you finish.

## Boost

Add a middle case with `else if (distanceToWall > 40)` that drives for only 500 milliseconds. Three outcomes from one number.
