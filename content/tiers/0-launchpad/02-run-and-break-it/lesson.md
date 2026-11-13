---
id: t0-run-and-break-it
title: Break it on purpose
tier: 0
minutes: 15
concept: Breaking the code three times on purpose is how you learn to read what the robot says back.
robot: tank
explorerLockedRanges: [[1, 16]]
---

## Mission

The robot drives, then you break the code three times on purpose and write down the line the robot names each time.

## Watch

The robot drives forward at full power. Short and simple, because this lesson is about what happens when the code is wrong.

## Learn

Code goes wrong all the time. Yours will, mine does, and everyone on your team's will too. That is normal.

When the code is wrong, the robot does not run. Instead you get an **error message**. It tells you two things: what confused the robot, and the **line number** where it got confused.

The line number is the useful part. Go to that line and look at it. Quite often the real problem is on the line right above it.

:::figure program-reader

Reading errors is the one skill that smooths out every other lesson. So in this lesson you are going to break the code on purpose, three times, and read what comes back each time. Nothing you break can hurt anything. Put it back and press Run again.

:::why
A compiler reads your file from top to bottom and builds a picture of what you meant. An error is the moment that picture stops making sense.

That is why a missing semicolon often points at the next line. The compiler kept reading, looking for the end of your instruction, and only gave up once it hit something that could not possibly belong. The character it complains about is where it ran out of patience, not where you made the mistake.

The same goes for a missing brace. Java has no idea where you meant to close a block, so it reads the whole rest of the file as if it were still inside that block, and the real error, behind "Show the real error", complains at the very end: reached end of file while parsing. Nebula counts the braces for you and points at the `{` that never got its `}` instead.

Once you know that, you stop reading the line number as an accusation and start reading it as a hint. The mistake is at or above that line, and usually within two or three lines of it.
:::

## Try

Three experiments. Do them one at a time, and put each one back before starting the next.

1. **Drop a semicolon.** Delete the `;` at the end of `int speed = 1;`. Press Run. Find the line number in what the robot says, then put the `;` back.
2. **Misspell a name.** Change `leftDrive.setPower(speed);` to `leftDrive.setPower(sped);`. Press Run. Find the line number, then fix the spelling.
3. **Delete a brace.** Delete the very last `}` in the file. Press Run. Find the line number, then put the `}` back.

Now fill in the TODO at the bottom. Each experiment has a `telemetry.addData` line with its name on it. Put the line number the robot named in place of that line's `0`. The numbers show up on the Driver Station when the program ends.

## Check

The checks want the three line numbers on the Driver Station, and the robot still driving afterwards. If the robot does not move, something is still broken. The checks cannot see your experiments. They read the numbers you wrote down.

## Boost

Try a fourth one: change `int speed = 1;` to `int speed = "fast";` and read what comes back. That error names two types. Which one did Java want?
