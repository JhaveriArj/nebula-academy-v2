---
id: t0-reading-errors
title: Reading errors
tier: 0
minutes: 15
concept: Five real error messages, and the fix each one is pointing at.
robot: tank
explorerLockedRanges: [[1, 12]]
---

## Mission

Five programs were broken, and you fix all five by reading what the robot said.

## Watch

Nothing drives in this one. The robot is parked while you work on five short programs that only print.

## Learn

Every error message has the same shape. There is a name for what went wrong, and sometimes a second line naming the exact word that confused the robot.

`';' expected` means an instruction did not finish. Put a `;` on the end.

`cannot find symbol` means you used a name the robot has never heard of. It names the word, so check the spelling against where you made it. Java sees `count` and `Count` as two different names.

`reached end of file while parsing` means a `{` never got its `}`. Count the braces.

`incompatible types` means you put the wrong kind of thing in a box. Text in quote marks is not a number, even when it looks like one.

None of these mean you are bad at this. They mean the robot got confused, and it is telling you where.

:::why
Three of those five are caught before the robot runs a single line, and two of them have to be. Java checks that every name exists and every type fits while it reads your file, so `cannot find symbol` and `incompatible types` arrive before the wheels could ever turn.

That is a real difference from some other languages, where a misspelled name is only discovered at the moment the program reaches that line, possibly halfway through a match. Java trades a little writing effort for the guarantee that if it runs at all, every name in it is real.

It is also why the error says `symbol: variable cont` rather than only pointing at the line. The compiler built a list of every name you created, looked `cont` up in it, and found nothing. The list it searched is the list of names in scope at that exact point, which is the idea Tier 2 comes back to.
:::

## Try

There are five TODO comments. Above each one is the broken code and the real error message it produced. Write the fixed line where the TODO is.

Work down the list and press Run after each one. The console fills up as you go.

## Check

The checks look for five lines in the console: `One`, `Two 2`, `Three`, `Four 4` and `FIVE`.

## Boost

Break program 2 a different way. Change `int count = 2;` to `int Count = 2;` but leave the println alone. Which error do you get, and why that one?
