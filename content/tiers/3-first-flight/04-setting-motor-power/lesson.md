---
id: t3-setting-motor-power
title: Telling a motor how fast
tier: 3
minutes: 20
concept: One motor at a time, and one motor alone does not drive the robot straight.
robot: mecanum
explorerLockedRanges: [[1, 24]]
---

## Mission

One wheel spins and the robot slews across the field instead of driving straight.

## Watch

Only the front left wheel is turning. Watch the robot wander off at an angle rather than going forwards.

## Learn

You met `setPower` in Tier 0. Here it is again on the real robot:

`frontLeft.setPower(0.5);`

**Power** runs from `-1.0` to `1.0`. The motor keeps whatever you last told it until you tell it something else, so a power set in `loop` is set again fifty times a second, which is fine.

Now watch what one wheel does. On a **mecanum** drivetrain, each wheel pushes the robot in its own direction, and the robot goes wherever the four pushes add up to. One wheel on its own pushes the robot forwards a bit, sideways a bit, and round a bit, all at once.

:::figure mecanum-strafe

That is why the robot slews instead of driving. It is not broken, and your line is not wrong. Three wheels are doing nothing.

Next lesson you give all four a power and find out that is not enough either.

:::why
Mecanum wheels have rollers set at 45 degrees around the rim. Spinning one forwards makes it grip along the roller angle rather than straight ahead, so it pushes the robot diagonally. Four wheels, four diagonals, and the leftovers cancel out to leave whatever motion you asked for.

That is also why a mecanum robot is slower sideways than forwards. Driving straight has all four wheels pulling the same way; strafing has them fighting each other, with only the sideways part surviving. This simulator models that at 85 percent, which is about right for a real robot.

Setting a power again every pass of `loop` looks wasteful and is the correct thing to do. A motor holds its last command, so if you only set it when it changed, a dropped command would leave the robot driving with nobody steering. Sending the same value fifty times a second means the robot is never doing something stale.
:::

## Try

Give `frontLeft` a power of `0.5` in `loop`.

Press Run and watch the path the robot takes.

## Check

The checks want `frontLeft` given real power and the robot moving somewhere, which it will, though not in a straight line.

## Boost

Add `backRight.setPower(0.5);` as well. Two wheels diagonally opposite. Does it drive straighter or spin faster? Try the other diagonal too.
