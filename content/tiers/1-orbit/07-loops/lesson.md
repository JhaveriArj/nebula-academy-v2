---
id: t1-loops
title: Doing it again
tier: 1
minutes: 20
concept: A loop repeats a block, so the square from Tier 0 fits in a quarter of the lines.
robot: tank
explorerLockedRanges: [[1, 17]]
---

## Mission

The robot drives the whole square from a block of code written only once.

## Watch

The same square as the Tier 0 checkpoint. Identical on the field, a quarter of the code.

## Learn

In Tier 0 you copied eleven lines four times to make a square. A **loop** does the repeating for you.

```
while (count > 0) {
    System.out.println(count);
    count--;
}
```

A `while` loop checks its condition, runs the block, and goes back to check again. It keeps going until the condition is false. `count--` takes one off `count`, and without it the condition would never change and the loop would never end.

When you know how many times, a **for** loop says so on one line:

```
for (int side = 1; side <= 4; side++) {
    System.out.println("side " + side);
}
```

Three parts in the brackets: start at 1, keep going while `side` is at most 4, and add one each time round. The block runs four times, with `side` holding 1, then 2, then 3, then 4.

:::figure loop-counter

:::why
A `for` loop is a `while` loop with its three moving parts written where you can see them, which is why FTC code uses `for` whenever the count is known and `while` whenever it depends on the world.

`side++` is shorthand for `side = side + 1`. There is `side--` for taking one off, and `side += 2` for adding two.

Notice that `side` is declared inside the brackets, so it only exists inside the loop. Asking for it afterwards is `cannot find symbol`. That is deliberate: the loop owns its counter.

The mistake worth knowing in advance is the one where the condition never becomes false. `while (count > 0)` with no `count--` runs forever, and on a real robot that means a program you cannot stop without pulling the battery. Here, Nebula notices and stops it for you, and your code is left exactly as you typed it. It happens to everyone, including people who have been doing this for years.
:::

## Try

Wrap the eleven driving lines in a `for` loop that runs four times, and print `side` with the number each time round.

Watch the indentation: everything inside the loop moves one step to the right, and the loop needs a `}` of its own at the end.

## Check

The checks want the full square: at least 200 cm driven, four corners, finishing near the start, and `side 4` in the console.

## Boost

Put a loop inside a loop. Make the outer one run twice, so the robot drives the square twice over. That is a nested loop, and the checkpoint needs one.
