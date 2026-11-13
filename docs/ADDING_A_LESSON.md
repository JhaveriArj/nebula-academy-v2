# Adding a lesson

Written for a mentor who knows Java and FTC but not TypeScript. You will only touch Markdown,
Java and JSON in `content/`. Nothing in `src/` needs to change.

## 1. Make the files

```sh
npm run new-lesson <tier> <slug>
# for example
npm run new-lesson 1 counting-down
```

This creates `content/tiers/<tier>/<nn>-<slug>/` with six files and adds the lesson to the end of
that tier in `content/pathway.json`. The lesson id is `t<tier>-<slug>`, for example
`t1-counting-down`.

**Move it above the checkpoint.** Every tier ends with its checkpoint lesson, and
`npm run check` fails if anything comes after it. Open `content/pathway.json`, find the new entry
at the end of the tier's `lessons` list, and move it up so the checkpoint is last again. (Its
folder number does not have to change.)

## 2. Fill in the six files

| File | What goes in it |
|---|---|
| `lesson.md` | The words. Front matter at the top, then the sections below. |
| `starter.java` | The code the kid starts with. It must compile as it is. Mark the work with `// TODO`. |
| `solution.java` | The finished code. It must pass `tests.json`. |
| `tests.json` | What counts as correct. |
| `watch.json` | The short demo the Watch step plays. |
| `hints.json` | Exactly three hints. After the third, the kid can see the solution. |

### lesson.md

```markdown
---
id: t1-counting-down
title: Counting down
tier: 1
minutes: 15
concept: One sentence that says what this lesson teaches.
robot: tank
explorerLockedRanges: [[1, 19], [24, 30]]
---

## Mission
## Watch
## Learn
:::why
The "Why this works" panel. Builder mode only.
:::
## Try
## Check
## Boost
```

- `robot` is `tank` for Tiers 0 to 2 and `mecanum` for Tiers 3 to 5.
- `explorerLockedRanges` are line ranges in `starter.java` that Explorer kids cannot edit. They
  see the unlocked lines marked in yellow. Leave the `// TODO` lines unlocked.
- The voice rules are in `CLAUDE.md`. In short: "you", present tense, one idea per lesson,
  Explorer's Learn section under 150 words, every new term **bold** and in
  `content/glossary.md`. Never "simply", "just", "easy" or "obviously". Hardware names are fixed:
  `leftDrive`, `rightDrive`, `frontLeft`, `frontRight`, `backLeft`, `backRight`, `armMotor`,
  `clawServo`, `distanceSensor`, `colorSensor`, `imu`.

### tests.json

```json
{
  "robot": "tank",
  "start": { "x": 182.88, "y": 30.48, "headingDeg": 0 },
  "withElements": false,
  "checks": [
    { "type": "robotMovedAtLeastCm", "cm": 80, "label": "The robot drives at least 80 cm" },
    { "type": "ranUnder", "ms": 10000, "label": "The whole run finishes in under 10 seconds" }
  ]
}
```

Positions are in centimetres on a 12 ft (365.76 cm) field, with (0, 0) at the bottom left. The
`label` is what the kid sees, so write it as something the robot does.

| Check | Passes when |
|---|---|
| `outputContains` `{ text, times? }` | The console printed `text` (at least `times` times). |
| `outputMatches` `{ pattern, flags? }` | The console output matches a regular expression. |
| `robotMovedAtLeastCm` `{ cm }` | The robot travelled at least `cm` in total. |
| `robotWithinCmOf` `{ x, y, tolerance }` | The robot ended within `tolerance` cm of (x, y). |
| `robotHeadingWithin` `{ degrees, tolerance, relative? }` | The robot ended facing `degrees`, give or take `tolerance`. With `relative: true` it compares the total turn instead, with no wrap-around (standing still is 360 short of a full turn); a whole number of turns may go either way. |
| `motorPowerEverExceeded` `{ motor, power }` | That motor was given more than `power` at some point. |
| `servoReached` `{ servo, position, tolerance? }` | That servo reached `position`. |
| `telemetryHasKey` `{ key }` | The code sent telemetry with that caption. |
| `telemetryContains` `{ text }` | A line the Driver Station showed (as `key : value`, after `telemetry.update()`) contains `text`. |
| `methodExists` `{ name, params?, className? }` | The code declares that method. |
| `classExists` `{ name, extends? }` | The code declares that class. |
| `ranUnder` `{ ms }` | The whole run finished in under `ms` of robot time. |

### watch.json

```json
{
  "robot": "tank",
  "start": { "x": 182.88, "y": 30.48, "headingDeg": 0 },
  "withElements": false,
  "durationMs": 3400,
  "steps": [
    { "atMs": 0, "motors": { "leftDrive": 0, "rightDrive": 0 }, "say": "Waiting for start" },
    { "atMs": 400, "motors": { "leftDrive": 0.5, "rightDrive": 0.5 }, "say": "Half power, both wheels" },
    { "atMs": 2400, "motors": { "leftDrive": 0, "rightDrive": 0 }, "say": "Stop" }
  ]
}
```

Each step sets motor powers (and `servos`, if you need them) at a time. `say` is the caption under
the field.

On the mecanum robot, add `"reverse": ["frontRight", "backRight"]` when the lesson's code
reverses that side, and write the same powers the lesson's code passes to `setPower`. The
readout then shows the positive powers and encoder counts the kid's own program will.

### hints.json

```json
{ "hints": ["A nudge.", "A bigger nudge.", "Almost the answer."] }
```

## 3. Check it

```sh
npm run check          # runs solution.java against tests.json, plus the voice and glossary rules
npm run verify:javac   # compiles starter.java and solution.java with real javac (needs a JDK)
```

If `npm run check` fails, the failing test is named after the lesson folder, and its message
says what is wrong. The common ones:

- **The solution fails a check.** Run the lesson in the browser (`npm run dev`), paste
  `solution.java` into the editor, press Check, and read which check is red.
- **"starter.java already passes every check, so there is nothing to learn".** The starter needs
  to leave work for the kid.
- **The starter does not run as it is.** A kid presses Run before editing, so `starter.java` must
  compile and run.
- **A glossary or voice failure**: a bolded term missing from `content/glossary.md`, a banned
  word, or a Learn section over the Explorer word budget.
- **A lesson after the checkpoint**: see step 1.
- **A method the FTC mock does not know**: the mock only has real SDK methods. If you need one it
  lacks, it has to be added in `src/ftc-mock/` and listed in `docs/FTC_MOCK_COVERAGE.md`. Ask
  whoever maintains the code.

## 4. Look at it

`npm run dev`, open the URL it prints, and go through all six steps in both Explorer and Builder.
Press Check with the starter code (it should fail kindly) and with the solution (it should
pass).
