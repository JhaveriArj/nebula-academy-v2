---
id: t5-git-and-github
title: Git and GitHub
tier: 5
minutes: 25
concept: Git keeps every version of your team's code, so nobody loses a day's work again.
robot: mecanum
explorerLockedRanges: [[1, 26]]
---

## Mission

You write down the five commands that get your team's code onto GitHub, in the order you need them.

## Watch

Nothing drives in this one. The robot is parked while you learn the tool your team keeps its code in.

## Learn

Your team has one robot and several people who want to change its code. Without a tool for that, you get folders called `auto_final_v2_REAL` and someone's work gets lost.

Git keeps every version. GitHub keeps a copy everyone can reach.

Five commands do almost everything:

`git clone` copies the team's code onto your computer, once.

`git status` tells you what you have changed. Run it constantly; it is the cheapest way to know where you are.

`git add` picks which changes to save.

`git commit` saves them as one version with a message. The message is for the teammate reading it at a competition, so "fix arm limit" beats "stuff".

`git push` sends your saved versions to GitHub.

A branch is a side copy where you try something without touching the code the robot runs this weekend.

:::why
The habit that matters most is committing often with messages that say why. A history of twenty small commits lets you find the one that broke the arm. One commit called "season" does not.

What git is actually for, in a team, is answering "what changed since it worked?". That question comes up at every competition, usually fifteen minutes before a match, and a team with a history can answer it in a minute.

The one rule worth having: whatever code is on the main branch should be code you would put on the robot right now. Anything in progress lives on a branch until it works. Teams that break that rule arrive at a competition unable to run their own autonomous.

Nebula itself lives in a git repository, and every lesson you have done was saved with a commit message. That is not a coincidence; it is how any software gets built.
:::

## Try

Show the five commands on the Driver Station, one `telemetry.addLine` each, in the order you would use them for a first push.

Then do the real thing. Ask your mentor for your team's repository address, and try `git clone`, `git status`, `git add`, `git commit` and `git push` on your own computer. This lesson's checks only look at the order, because the real work happens off this website.

## Check

The checks want the five commands on the Driver Station in the right order.

## Boost

Find out what `git log` and `git diff` show you. Then make a branch with `git switch -c my-idea` and ask your mentor what it is for.
