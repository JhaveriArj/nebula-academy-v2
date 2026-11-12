---
id: t2-making-an-object
title: Building one
tier: 2
minutes: 20
concept: One class can build many objects, and each remembers its own values.
robot: tank
explorerLockedRanges: [[1, 19]]
---

## Mission

The robot holds two different mission plans at once and drives a side of one of them.

## Watch

The robot drives one side. Two plans existed; it followed the square.

## Learn

Last lesson the fields had values written into the blueprint, so every `MissionPlan` came out the same. A blueprint that can only make one thing is not much of a blueprint.

A **constructor** fixes that. It runs once, when the object is built, and fills the fields in:

```
MissionPlan(String name, int sides, double sideSeconds) {
    this.name = name;
    this.sides = sides;
    this.sideSeconds = sideSeconds;
}
```

Same name as the class, and no return kind at all, not even `void`.

`this.name` means the field. Plain `name` means the parameter. They are allowed to share a name, and `this.` is how you say which one you mean.

Now **new** builds one, handing over the values:

```
MissionPlan square = new MissionPlan("Square", 4, 1.0);
MissionPlan triangle = new MissionPlan("Triangle", 3, 1.4);
```

Two **object**s from one class. `square.sides` is 4 and `triangle.sides` is 3, and neither knows about the other.

:::figure object-press

:::why
`this` looks like clutter and is doing something precise. Inside a constructor there are two things called `name`: the field and the parameter. Java picks the nearest, which is the parameter, so writing `name = name;` copies the parameter onto itself and leaves the field empty. The compiler does not stop you. The field quietly stays `null`, and your robot has a plan with no name.

That is the single most common constructor bug, and `this.` is the whole fix.

This is also where `null` becomes real. A field you never fill holds `null`, which means "nothing here yet", and using it gives `NullPointerException`. That is exactly the error you saw if you ever used a motor before its `hardwareMap.get` line: the field existed, but nothing had been put in it.
:::

## Try

Write the constructor, then build the two plans, print both names, and drive one side of the square.

Remember `this.` on the left of each assignment in the constructor.

## Check

The checks want both names in the console and the robot driving one side of about 60 cm.

## Boost

Take the `this.` off one line in the constructor and press Run. What does that field hold now? Then put it back.
