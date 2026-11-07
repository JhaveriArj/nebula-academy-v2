---
id: t2-class-with-fields
title: A blueprint with fields
tier: 2
minutes: 20
concept: A class describes what a kind of thing remembers.
robot: tank
explorerLockedRanges: [[1, 19]]
---

## Mission

The robot reads its mission plan out of one thing that holds all three details.

## Watch

The robot drives one side. The plan it followed came out of a single object holding three values.

## Learn

A mission plan has a name, a number of sides, and how long each side takes. You could keep three separate variables. A **class** keeps them together as one thing.

```
class MissionPlan {
    String name = "Square";
    int sides = 4;
    double sideSeconds = 1.0;
}
```

Variables that belong to a class are its **field**s. They live at the top of the class, outside any method, and that is what lets every method in the class reach them.

A class is only a blueprint. It describes a mission plan; it is not one. Making an actual one is next lesson's job, though you have already seen the line that does it:

`MissionPlan plan = new MissionPlan();`

After that, each field is reached with a dot:

`System.out.println(plan.name);`

You have been using fields already. `leftDrive` is a field of your OpMode, which is why the methods you wrote last lesson could see it.

:::why
A blueprint is not the thing. Drawings of a house do not keep the rain off, and `class MissionPlan` does not hold a plan until something builds one with `new`.

That distinction is doing real work in FTC. `DcMotor` is a blueprint for a motor. Your robot has four actual motors, each a separate object, each remembering its own power and its own encoder count. One blueprint, four things.

Fields also give you somewhere to put state that has to survive between method calls. A local variable inside `runOpMode` vanishes when the method ends, which is fine for an autonomous that runs once. A TeleOp is different: `loop()` runs fifty times a second and anything it needs to remember between runs has to be a field. Tier 5's state machine is built entirely on that.
:::

## Try

Give `MissionPlan` its three fields, print all three, and drive one side using `plan.sideSeconds`.

The class sits inside your OpMode class, after `runOpMode`.

## Check

The checks want a class called `MissionPlan`, the three values in the console, and the robot driving one side of about 60 cm.

## Boost

Add a fourth field, `double turnSeconds = 0.785;`, and use it to turn one corner after the side. Then change `sideSeconds` to `2.0` and watch what moves.
