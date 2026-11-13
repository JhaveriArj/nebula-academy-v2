---
id: t1-true-and-false
title: True or false
tier: 1
minutes: 15
concept: A boolean holds one of two values, and comparing two numbers makes one.
robot: tank
explorerLockedRanges: [[1, 18]]
---

## Mission

The robot works out whether it is going fast enough and says so on the Driver Station.

## Watch

The robot drives at a good clip. The interesting part is on the Driver Station, not on the field.

## Learn

An `int` holds any whole number. A `double` holds any number with a point. A **boolean** holds one of exactly two values: `true` or `false`. Nothing else fits.

`boolean launchReady = true;`

Most of the time you do not type `true` yourself. You get one by asking a question about two numbers:

`boolean fastEnough = speed > 0.5;`

The robot works out `speed > 0.5`, which is either true or false, and stores that answer in `fastEnough`.

The questions you can ask are `>` more than, `<` less than, `>=` at least, `<=` at most, `==` the same as, and `!=` different from.

That doubled `==` matters. One `=` puts a value in a box. Two `==` asks whether two values match.

:::why
A boolean looks like the least useful of the three kinds, holding only two values, and it turns out to be the one that makes a robot look clever. Everything a robot decides for itself comes down to one: is the wall closer than 20 cm, has the timer passed 3 seconds, is the tile blue, did the driver press A.

Two lessons from now you will feed one into `if`, and from that point your programs stop being a fixed list of moves and start reacting to the world.

Notice that `speed > 0.5` is worked out once, at the moment that line runs, and the answer is then frozen in `fastEnough`. If `speed` changes afterwards, `fastEnough` does not change with it. It is a stored answer, not a live question. That trips up nearly everyone once, usually inside a loop, and knowing it in advance saves an afternoon.
:::

## Try

Make a `boolean` called `fastEnough` holding the answer to "is `speed` more than `0.5`?". Show it on the Driver Station with `telemetry.addData("fastEnough", fastEnough);` and `telemetry.update();`.

With `speed` at `0.3` it shows `false`. Change `speed` so it shows `true`.

## Check

The checks want `true` on the Driver Station and the robot still driving.

## Boost

Add a second boolean, `boolean stopped = speed == 0.0;`, and show that too. Then set `speed` to exactly `0.5`. Is `fastEnough` true? Read the question again.
