---
id: t1-checkpoint-launch
title: "Checkpoint: launch sequence"
tier: 1
minutes: 25
concept: Put the whole tier together. A variable, a choice, and a loop in one program.
robot: tank
explorerLockedRanges: [[1, 19]]
---

## Mission

The robot counts down from ten and launches, unless the fuel is too low to go.

## Watch

The Driver Station counts down, says Launch, and the robot drives away. Nothing happens on the field until the count reaches one.

## Learn

Everything in this tier, in one program.

A **variable** holds the fuel level. A **condition** compares it against the threshold. An **if** picks between aborting and launching. A **for** loop does the counting.

The shape is this:

```
if (fuelLevel < threshold) {
    show the abort line
} else {
    count down
    show Launch
    drive
}
```

The counting loop goes *down*, which is the one new thing. Start at 10, keep going while the count is at least 1, and take one off each time round:

`for (int count = 10; count >= 1; count--)`

Note `>=` rather than `>`. With `>` the loop would stop after 2 and never show 1.

Everything that happens on a successful launch lives inside the `else` block, so a low fuel level means the robot never moves at all.

:::why
This is the shape of every real autonomous: check a condition, then either do the thing or bail out safely. A team that only writes the happy path finds out at a competition, when a sensor reads something unexpected and the robot drives into a wall at full power because nothing told it not to.

The habit worth taking from this lesson is that the abort branch comes first and does the least. Being sure about code that does nothing takes less effort than being sure about code that does something complicated under pressure.

Watch the off-by-one in the loop condition, because it is the most common loop bug there is. `count >= 1` gives you ten numbers, 10 down to 1. `count > 1` gives nine, stopping at 2. `count >= 0` gives eleven and shows a zero nobody asked for. When a loop does one too many or one too few, the condition is where to look first.
:::

## Try

Write the `if` and the `else`.

Low fuel shows `Abort: fuel too low` and nothing else happens. Enough fuel counts down from 10 to 1, showing each number under the label `countdown` with a `sleep(500)` after it so the driver can read it, then shows `Launch` and drives at power `0.8` for 1500 milliseconds. Every message is a `telemetry` line followed by `telemetry.update();`.

Test both: run it with `fuelLevel` at 90, then at 20, then put it back to 90.

## Check

The checks want the numbers 10 down to 1 in order on the Driver Station, the word `Launch`, and the robot driving at least 100 cm. Leave `fuelLevel` at 90 before you finish.

## Boost

Put the whole launch inside a nested loop so the robot does two launches, one after the other, with the countdown both times. Then make the abort branch count the fuel it is short by.
