---
id: t2-return-values
title: Handing something back
tier: 2
minutes: 20
concept: A method can work an answer out and hand it back, instead of only doing a job.
robot: tank
explorerLockedRanges: [[1, 21]]
---

## Mission

The robot asks one method how long 90 cm takes, then drives for exactly that long.

## Watch

The robot stops after 90 cm. The number it drove for was worked out, not typed.

## Learn

Every method so far has said `void`, which means it hands nothing back. It does its job and that is that.

A method can instead work something out and hand you the answer:

```
private int msForCm(int cm) {
    return cm * 1000 / 60;
}
```

Two changes. `void` became `int`, which promises to hand back a whole number. And `return` hands it back.

`return` also stops the method there and then. Any lines after it never run.

Now the method's name stands in for its answer, anywhere a number would go:

`sleep(msForCm(90));`

The robot runs `msForCm(90)`, gets 1500, and uses that. You can show it on the Driver Station, store it in a variable, or feed it to another method.

Forget the `return` and Java stops you with `missing return statement`, because you promised an `int`.

:::why
This is the difference between a command and a question. `driveForward(1.5)` is a command: go and do this. `msForCm(90)` is a question: work this out and tell me. Autonomous code is full of both, and keeping them apart makes a program far clearer to follow.

A method that only answers a question, touching no motors and changing nothing, is the kind of code you can be most confident about. Hand it 90 and it gives 1500, every time, forever. That is also why `msForCm` would be the first thing to write a test for on a real team's codebase.

Watch the integer division in there, because it is the same trap as Tier 1 lesson 05. `cm * 1000 / 60` multiplies first and is fine. Written `cm / 60 * 1000` it would give 1000 instead of 1500, and the robot would stop 30 cm short with nothing on screen to explain it.
:::

## Try

Write `msForCm` so it takes an `int cm` and returns an `int`. Then show the answer on the Driver Station with `telemetry.addData` and `telemetry.update()`, and use it in the `sleep`.

## Check

The checks want a method called `msForCm` that takes one value, the Driver Station reading `driving for : 1500 ms`, and the robot finishing 90 cm up the field.

## Boost

Add `private int msForTurn(int degrees)` that returns how long a turn of that many degrees takes. At the powers you have been using, a full 360 degrees takes about 3140 milliseconds.
