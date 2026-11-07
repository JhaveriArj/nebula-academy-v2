---
id: t5-hardware-class
title: One place for the hardware
tier: 5
minutes: 30
concept: Keeping the hardware in one class means a rebuilt robot is one file to change, not every file.
robot: mecanum
explorerLockedRanges: [[1, 19]]
---

## Mission

The robot drives from one small OpMode that knows nothing about motor names.

## Watch

The robot drives from the stick. The interesting part is how little the OpMode has to say.

## Learn

Your TeleOp and your autonomous both need the same five `hardwareMap.get` lines and the same two reversals. Copied into both, a rebuild means you have to change both and hope you spot it.

A hardware class holds them once:

```
static class Hardware {
    DcMotor frontLeft;
    ...
    void init(HardwareMap map) {
        frontLeft = map.get(DcMotor.class, "frontLeft");
        ...
    }
    void drive(double power) { ... }
}
```

It takes the `HardwareMap` as a parameter, exactly as Tier 2's `Robot` took its motors. The OpMode then says only this:

```
robot = new Hardware();
robot.init(hardwareMap);
```

and afterwards `robot.drive(power)`.

Now the OpMode is about driving and the hardware class is about wiring. Rename a motor and one file changes.

:::why
This is the single biggest change a team can make to how its code feels, and it is Tier 2's checkpoint grown up. Both OpModes get the same hardware, the same reversals and the same helper methods, so a bug fixed for the autonomous is fixed for the TeleOp too.

It is also what makes a season survivable. Robots get rebuilt in week four. A team with a hardware class edits one file; a team without it hunts through six OpModes for a motor name and misses one.

In a real project `Hardware` lives in its own file, `Hardware.java`, in the same `teamcode` folder. Nebula's editor holds one file at a time, so here it is a nested class, which behaves the same way. The `static` matters: without it the class would be tied to one OpMode instance, and the whole point is that both OpModes share it.

Teams often go further and put the robot's numbers in there too: ticks per centimetre, the claw's open and closed positions, the arm's limits. Then tuning the robot is editing a list of numbers in one place rather than hunting for magic numbers.
:::

## Try

Three TODOs. Write `init(HardwareMap map)` and `drive(double power)` on `Hardware`, then use them from `loop`.

## Check

The checks want a class called `Hardware` with both methods, and the robot driving from the stick.

## Boost

Add `openClaw()` and `closeClaw()` to `Hardware` and put them on A and B. Then add a `TICKS_PER_CM` field and a `driveCm(double cm)` method that uses it.
