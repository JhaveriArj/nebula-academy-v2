# Nebula Academy — project rules

## What this is
A static site teaching kids (9–18) FTC robot programming in Java. Two modes: Explorer (ages 9–12) and Builder (ages 13–18). Real Java runs in the browser against a mocked FTC SDK and a 2D virtual robot. Deployed to GitHub Pages.

## Hard rules
- Java only. Never add Python, Blocks, or any other language to lessons.
- Content (content/) and code (src/) never mix. A lesson is Markdown + Java + JSON only.
- The FTC mock uses real package names and real method signatures. Never invent a method that doesn't exist in the real FTC SDK (ftc-docs.firstinspires.org, github.com/FIRST-Tech-Challenge/FtcRobotController). Check docs/FTC_MOCK_COVERAGE.md; if a lesson needs an unmocked method, mock it first and update the coverage doc.
- No backend, no accounts, no analytics. Progress lives in localStorage with file export/import.
- Macs and home computers (trackpad, mouse, sometimes touch); 1366×768 is the baseline. No hover-only UI: hover may add polish, never the only way to find or do something. Tap targets at least 44×44 px.
- `npm run check` (lint + test + build) must pass before every commit. Never commit a lesson whose solution.java fails its own tests.json.

## Voice for lesson text
- Second person, present tense, one idea per lesson. "You tell the motor how fast to spin."
- Explorer Learn section: under 150 words, no word over three syllables unless it's a Java keyword, every new term bolded and in content/glossary.md.
- Builder adds a `:::why` panel (rendered as "Why this works") that can go deeper; still under 250 words.
- Never say "simply", "just", "easy", or "obviously". Never shame a wrong answer. Errors are framed as "the robot got confused", not "you were wrong".
- Every code example is a robot doing something. No bank accounts, no grade calculators, no abstract `foo`.
- Hardware names are fixed across all tiers: `leftDrive`, `rightDrive`, `frontLeft`, `frontRight`, `backLeft`, `backRight`, `armMotor`, `clawServo`, `distanceSensor`, `colorSensor`, `imu`.
- Celebrations are brief: 1 second, then the next-lesson button. No paragraph of praise.

## Lesson file contract
content/tiers/<tier>/<nn>-<slug>/
  lesson.md      frontmatter: id, title, tier, minutes, concept, robot (tank|mecanum), explorerLockedRanges
  starter.java   compiles as-is; contains // TODO markers
  solution.java  passes tests.json
  tests.json     array of checks (types defined in src/runtime/testRunner.ts)
  watch.json     scripted sim demo played by the Watch step
  hints.json     exactly three hints, then "show solution"

## Error translation
src/runtime/errorTranslator.ts maps javac/runtime errors to kid-friendly messages WITH the line number and the likely fix. Add a case for every new error kids will hit in a lesson. Keep the original error visible behind a "Show the real error" toggle.

## Commands
npm run dev · npm run check · npm run build · npm run new-lesson <tier> <slug> (scaffolds the six files)

## When unsure
Prefer the choice that is simpler for a 10-year-old over the choice that is more "correct" for an engineer. Do not add a dependency over 100 KB without a note in docs/ARCHITECTURE.md saying why.
