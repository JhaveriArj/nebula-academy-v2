---
id: t5-servos-and-limits
title: Servos and limits
tier: 5
minutes: 25
concept: Software limits stop a mechanism destroying itself when a driver holds the wrong trigger.
robot: mecanum
explorerLockedRanges: [[1, 27]]
---

## Mission

The arm lifts while the trigger is held and refuses to go past the top of its travel.

## Watch

The arm rises, reaches its limit and stops, with the trigger still held. Then the claw closes.

## Learn

A `Servo` goes to a position between `0.0` and `1.0`:

`clawServo.setPosition(1.0);`

It holds there until told otherwise. A motor takes a power and keeps spinning; a servo takes a place and stays.

An arm on a motor has no such protection. Hold the trigger and it keeps pulling, past the top of its travel, into the frame, until something gives. A stalled motor gets hot in seconds and a bent arm ends your day.

The fix is a software limit. Read the encoder, and refuse to make it worse:

```
if (armPower > 0 && ticks >= 1100) {
    armPower = 0;
}
```

Going up and already at the top means no power. Note it refuses `armPower > 0` only, so the driver can still bring the arm down. A limit that stops both directions traps the arm at the top.

The same at the bottom, with `armPower < 0` and a low tick count.

:::why
This is the first thing a team adds after breaking something, and the first thing a good team adds before breaking something.

Zeroing matters as much as the limit. The encoder counts from wherever the arm happened to be when the robot powered on, so a limit of 1100 means nothing unless the arm starts in a known place. Teams either park the arm at the bottom before every match, or add a touch sensor at the bottom and drive down to it during `init`.

A `CRServo` is the odd one out: it looks like a servo and behaves like a motor, taking a power with `setPower` and spinning continuously with no idea where it is. Good for a roller or an intake, no good for anything that needs to stop in a particular place.

Worth knowing too: `setPosition` is a request. A servo asked for `1.0` with something in the way will sit there pushing and getting hot, and nothing in the API tells you that is happening. Mechanisms that might jam want a motor and an encoder, not a servo.
:::

## Try

Two TODOs. Clamp `armPower` at both ends, printing `arm at limit` the first time the top is reached, and put the claw on A and B.

## Check

The checks want `arm at limit` printed, the claw closed at the end, and the tick count on telemetry.

## Boost

Make the limit ease off instead of cutting out. Scale `armPower` down as the arm gets within 200 ticks of the top, so it slows to a stop rather than stopping dead.
