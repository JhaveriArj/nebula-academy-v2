---
id: t3-teleop-init-and-loop
title: init and loop
tier: 3
minutes: 20
concept: Setting up belongs in init, and watching belongs in loop.
robot: mecanum
explorerLockedRanges: [[1, 14]]
---

## Mission

Your program counts its own loops and speaks up exactly once, when it reaches fifty.

## Watch

Still quiet on the field. Watch the Driver Station for the one line that changes part way through.

## Learn

Two methods, two different jobs, and putting something in the wrong one is the most common mistake in this tier.

**init** happens once. It is where setting up goes: fetching motors, reversing a side, setting a servo to its starting place, zeroing a counter.

**loop** happens over and over, about fifty times a second. It is where watching goes: reading the sticks, reading a sensor, deciding, and telling motors what to do.

:::figure opmode-lifecycle

The test is to ask how often a thing should happen. Fetching a motor once is setting up. Reading a stick is watching.

Put setting up in `loop` and it happens fifty times a second, which at best wastes time and at worst undoes itself constantly.

Because `loop` runs again and again, an `if` inside it fires on whichever pass makes it true:

```
loops++;
if (loops == 50) {
    message = "50 loops";
}
```

That changes `message` once, on the fiftieth pass, and never again. Telemetry shows it from then on.

:::why
`loops == 50` being true on exactly one pass is worth stopping on, because it is the shape of every button press you will ever handle.

Think about what happens with `if (gamepad1.a) { count++; }`. A human holds a button for maybe a fifth of a second, which is ten passes of `loop`, so `count` goes up by ten from one press. Nearly every team hits this and concludes the gamepad is broken.

The fix is to remember what the button was doing last time, in a field, and act only when it has changed:

```
if (gamepad1.a && !aWasPressed) { count++; }
aWasPressed = gamepad1.a;
```

That is called edge detection, and the reason it needs a field is the reason this lesson exists: `loop()` keeps nothing of its own between passes. Anything it has to remember, you have to store.
:::

## Try

Set `loops` to `0` in `init`, then in `loop` add one to it and set `message` to `"50 loops"` when it reaches exactly 50. The telemetry lines are already written.

Use `==` for the comparison, not `=`.

## Check

The checks want `message : 50 loops` on the Driver Station, exactly as written.

## Boost

Put `telemetry.addLine("fifty!");` inside the `if` and press Run. Blink and you miss it: telemetry is built fresh every pass, so that line is there for one pass, a fiftieth of a second. Now change `==` to `>=`. Why does it stay?
