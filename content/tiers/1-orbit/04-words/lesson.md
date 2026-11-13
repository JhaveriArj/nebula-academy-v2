---
id: t1-words
title: Words the robot can say
tier: 1
minutes: 15
concept: A String holds text, and the plus sign joins pieces of it together.
robot: tank
explorerLockedRanges: [[1, 18]]
---

## Mission

The robot shows one line naming its pilot and its mission number.

## Watch

The robot nudges forward. Watch the Driver Station: that is where this lesson happens.

## Learn

A **String** holds text. You write text inside double quote marks:

`String pilot = "Sam";`

The quote marks are how you write it, not part of the text. The String holds `Sam`.

To join pieces of text, use `+`:

`telemetry.addLine("Pilot " + pilot);`

That shows `Pilot Sam` on the Driver Station. Notice the space inside the quote marks, before the closing one. Without it you get `PilotSam`, because `+` joins exactly what you give it and adds nothing of its own.

You can join a number to text too. `"mission " + 4` gives `mission 4`. Java turns the number into text for you, but only because one side is already text.

So `+` does two different jobs. Between two numbers it adds. Where either side is text, it joins.

:::why
That double meaning catches everyone out at least once. `"total " + 2 + 3` shows `total 23`, not `total 5`, because Java works left to right: it joins `"total "` and `2` into text, then joins `3` onto the end. Brackets fix it: `"total " + (2 + 3)`.

A String is also not a number that happens to look like one. `"4"` is text and `4` is an int, which is the `incompatible types` error from Tier 0 lesson 03. Going the other way needs asking: `Integer.parseInt("4")` hands you the int.

`telemetry.addLine` shows one piece of text with no label. `telemetry.addData`, from the earlier lessons, shows a label and a value side by side and does the joining for you. Both only build the line up; `telemetry.update()` is what sends it to the driver's phone. Tier 3 puts these lines up while the robot drives, fifty times a second, which is how real teams watch what their code is thinking.
:::

## Try

Make a `String` called `pilot` holding your own name. Then show one line on the Driver Station reading `Pilot`, then your name, then `on mission`, then the mission number. Use `telemetry.addLine(...)` and then `telemetry.update();`.

Mind the spaces inside the quote marks.

## Check

The checks want a line shaped like `Pilot <a name> on mission 4`.

## Boost

Show a second line using `"The robot is " + mission + " missions old"`. Then put `"1" + 2` and `1 + 2` on two lines and compare what comes out.
