---
id: t4-autonomous-linearopmode
title: A program that runs itself
tier: 4
minutes: 25
concept: An autonomous runs top to bottom with nobody driving, so LinearOpMode suits it better than OpMode.
robot: mecanum
explorerLockedRanges: [[1, 21]]
---

## Mission

The robot drives forward on its own, with nobody touching a controller.

## Watch

The robot drives straight up the field and stops. No sticks, no driver.

## Learn

In a match, the first thirty seconds have nobody driving. The robot has to do a planned set of moves by itself. That is **autonomous**.

A TeleOp fits `init` and `loop` because a driver keeps changing their mind. An autonomous is a list of moves in order, so it uses a different base class:

```
@Autonomous(name = "First Autonomous")
public class FirstAutonomous extends LinearOpMode {
    @Override
    public void runOpMode() {
        ...
    }
}
```

`extends LinearOpMode` instead of `OpMode`, and one method called `runOpMode` instead of `init` and `loop`. Your code runs from the top of `runOpMode` to the bottom, once, exactly like every program you wrote in Tiers 0 to 2.

`@Autonomous` instead of `@TeleOp` puts it in the autonomous list on the driver's phone.

Because it runs top to bottom, `sleep` is welcome here. In a TeleOp it would freeze the controls. In an autonomous, waiting is often the whole point.

:::why
Both classes are OpModes and the robot treats them the same way. `LinearOpMode` is written as a `loop()` that starts your `runOpMode` on its own thread, which is why `sleep` inside it blocks your code without freezing the robot.

That detail leaks in one place that matters: `isStopRequested()`. When the driver presses STOP, the robot cannot yank your method out mid-line, so a `sleep(5000)` keeps sleeping. An autonomous written as one long chain of sleeps can keep running for seconds after STOP, which is both a rules problem and a safety one. Next lesson is about the loop guard that fixes it.

Which to use is a real choice and not only a convention. A TeleOp that needs a timed sequence can be a `LinearOpMode`, and an autonomous that is really a state machine can be an `OpMode`. The question is whether your code is a list or a reaction.
:::

## Try

Write the driving. All four motors to `0.5`, `sleep` for 1500 milliseconds, then all four back to `0`.

## Check

The checks want the robot to drive at least 80 cm and still be facing forwards.

## Boost

Add a second move: turn by giving the left pair and right pair opposite powers for 500 milliseconds, then drive forward again. That is an autonomous with three steps.
