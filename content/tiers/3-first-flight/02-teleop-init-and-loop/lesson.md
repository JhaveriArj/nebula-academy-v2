---
id: t3-teleop-init-and-loop
title: init and loop
tier: 3
minutes: 20
concept: Setting up belongs in init, and watching belongs in loop.
robot: mecanum
explorerLockedRanges: [[1, 12]]
---

## Mission

Your program counts its own loops and speaks up exactly once, when it reaches fifty.

## Watch

Still quiet on the field. Watch the console for the one line that appears part way through.

## Learn

Two methods, two different jobs, and putting something in the wrong one is the most common mistake in this tier.

**init** happens once. It is where setting up goes: fetching motors, reversing a side, setting a servo to its starting place, zeroing a counter.

**loop** happens over and over, about fifty times a second. It is where watching goes: reading the sticks, reading a sensor, deciding, and telling motors what to do.

The test is to ask how often a thing should happen. Fetching a motor once is setting up. Reading a stick is watching.

Put setting up in `loop` and it happens fifty times a second, which at best wastes time and at worst undoes itself constantly.

Because `loop` runs again and again, an `if` inside it fires on whichever pass makes it true:

```
loops++;
if (loops == 50) {
    System.out.println("50 loops");
}
```

That prints once, on the fiftieth pass, and never again.

:::why
`loops == 50` printing exactly once is worth stopping on, because it is the shape of every button press you will ever handle.

Think about what happens with `if (gamepad1.a) { count++; }`. A human holds a button for maybe a fifth of a second, which is ten passes of `loop`, so `count` goes up by ten from one press. Nearly every team hits this and concludes the gamepad is broken.

The fix is to remember what the button was doing last time, in a field, and act only when it has changed:

```
if (gamepad1.a && !aWasPressed) { count++; }
aWasPressed = gamepad1.a;
```

That is called edge detection, and the reason it needs a field is the reason this lesson exists: `loop()` keeps nothing of its own between passes. Anything it has to remember, you have to store.
:::

## Try

Set `loops` to `0` in `init`, then in `loop` add one to it and print `50 loops` when it reaches exactly 50.

Use `==` for the comparison, not `=`.

## Check

The checks want `50 loops` in the console, exactly as written.

## Boost

Change `==` to `>=` and press Run. How many lines do you get now, and why so many?
