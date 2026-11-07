#!/usr/bin/env node
/* Scaffolds the six files a lesson needs, then tells you what to do next.
   Written for a mentor who does not know TypeScript. See docs/ADDING_A_LESSON.md.

   Usage: npm run new-lesson <tier> <slug>
   Example: npm run new-lesson 1 counting-down */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const [tierArg, slug] = process.argv.slice(2);

const die = (msg) => {
  console.error(`\n${msg}\n`);
  console.error('Usage: npm run new-lesson <tier 0-5> <slug-with-dashes>');
  console.error('Example: npm run new-lesson 1 counting-down\n');
  process.exit(1);
};

if (!tierArg || !slug) die('Tell me which tier and what to call the lesson.');
const tier = Number(tierArg);
if (!Number.isInteger(tier) || tier < 0 || tier > 5) die(`"${tierArg}" is not a tier. Tiers are 0 to 5.`);
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
  die(`"${slug}" should be lower case words joined by dashes, like counting-down.`);
}

const pathwayPath = join(ROOT, 'content/pathway.json');
const pathway = JSON.parse(readFileSync(pathwayPath, 'utf8'));
const tierEntry = pathway.tiers.find((t) => t.tier === tier);
if (!tierEntry) die(`pathway.json has no tier ${tier}.`);

const tierDir = join(ROOT, 'content/tiers', tierEntry.slug);
mkdirSync(tierDir, { recursive: true });

const existing = readdirSync(tierDir).filter((d) => /^\d\d-/.test(d));
const number = String(existing.length + 1).padStart(2, '0');
const dir = `${number}-${slug}`;
const abs = join(tierDir, dir);
if (existsSync(abs)) die(`content/tiers/${tierEntry.slug}/${dir} already exists.`);

const id = `t${tier}-${slug}`;
if (pathway.tiers.some((t) => t.lessons.some((l) => l.id === id))) {
  die(`A lesson with the id ${id} already exists. Pick a different slug.`);
}

const title = slug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
const robot = tierEntry.robot;
const isTank = robot === 'tank';
const driveMotors = isTank ? ['leftDrive', 'rightDrive'] : ['frontLeft', 'frontRight', 'backLeft', 'backRight'];
const className = slug.split('-').map((w) => w.replace(/^./, (c) => c.toUpperCase())).join('');

const starter = `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;

@Autonomous(name = "${title}")
public class ${className} extends LinearOpMode {

    @Override
    public void runOpMode() {
${driveMotors.map((m) => `        DcMotor ${m} = hardwareMap.get(DcMotor.class, "${m}");`).join('\n')}

        waitForStart();

        // TODO: write the robot's instructions here.

    }
}
`;

const solution = starter
  .replace('        // TODO: write the robot\'s instructions here.\n', [
    ...driveMotors.map((m) => `        ${m}.setPower(0.5);`),
    '        sleep(1000);',
    ...driveMotors.map((m) => `        ${m}.setPower(0);`),
  ].join('\n') + '\n');

const lockedEnd = starter.split('\n').findIndex((l) => /\/\/\s*TODO/.test(l));

const files = {
  'lesson.md': `---
id: ${id}
title: ${title}
tier: ${tier}
minutes: 15
concept: One sentence saying the single idea this lesson teaches.
robot: ${robot}
explorerLockedRanges: [[1, ${lockedEnd}]]
---

## Mission

One sentence saying what the robot will do.

## Watch

What to look for in the demo above.

## Learn

The one idea, under 150 words, in the second person and the present tense.
Bold every new term, like **variable**, and add it to content/glossary.md.

:::why
Builder-only. Goes deeper, stays under 250 words. Rendered as "Why this works".
:::

## Try

What to change in the code, and what should happen when they press Run.

## Check

What the tests are looking for, in plain words.

## Boost

One stretch for whoever finishes early.
`,
  'starter.java': starter,
  'solution.java': solution,
  'tests.json': `${JSON.stringify(
    {
      robot,
      start: isTank ? { x: 182.88, y: 30.48, headingDeg: 0 } : { x: 182.88, y: 60, headingDeg: 0 },
      checks: [
        { type: 'robotMovedAtLeastCm', cm: 40, label: 'The robot drives forward' },
      ],
    },
    null,
    2,
  )}\n`,
  'watch.json': `${JSON.stringify(
    {
      robot,
      start: isTank ? { x: 182.88, y: 30.48, headingDeg: 0 } : { x: 182.88, y: 60, headingDeg: 0 },
      durationMs: 3000,
      steps: [
        { atMs: 0, motors: Object.fromEntries(driveMotors.map((m) => [m, 0.5])), say: 'Driving forward' },
        { atMs: 2000, motors: Object.fromEntries(driveMotors.map((m) => [m, 0])), say: 'Stop' },
      ],
    },
    null,
    2,
  )}\n`,
  'hints.json': `${JSON.stringify(
    {
      hints: [
        'First hint: point at the line to look at, without giving the answer.',
        'Second hint: name the method or keyword they need.',
        'Third hint: show the shape of the line with a blank left in it.',
      ],
    },
    null,
    2,
  )}\n`,
};

mkdirSync(abs, { recursive: true });
for (const [name, body] of Object.entries(files)) writeFileSync(join(abs, name), body);

tierEntry.lessons.push({ id, dir });
tierEntry.checkpoint = tierEntry.checkpoint || id;
writeFileSync(pathwayPath, `${JSON.stringify(pathway, null, 2)}\n`);

console.log(`\nMade content/tiers/${tierEntry.slug}/${dir} with all six files.`);
console.log(`Added ${id} to content/pathway.json as lesson ${number} of tier ${tier}.\n`);
console.log('Next:');
console.log('  1. Write lesson.md. Every placeholder in it needs replacing.');
console.log('  2. Put the starting code in starter.java, with // TODO where the kid works.');
console.log('  3. Put the finished code in solution.java.');
console.log('  4. Say what counts as correct in tests.json.');
console.log('  5. Run  npm run check');
console.log('\nThat last step runs solution.java against tests.json, so it tells you');
console.log('whether the lesson actually works. docs/ADDING_A_LESSON.md has the details.\n');
