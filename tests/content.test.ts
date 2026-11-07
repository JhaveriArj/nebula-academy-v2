import { describe, it, expect } from 'vitest';
import {
  loadPathway, lessonLocations, lessonFoldersOnDisk, missingFiles, loadLesson,
  loadAllLessons, readContentFile, contentFileExists,
} from './helpers/content';
import { existsSync } from 'node:fs';
import { boldedTerms } from '../src/content/parse';
import { SECTION_ORDER } from '../src/content/types';
import { CHECK_TYPES } from '../src/runtime/testRunner';
import { coverageKeys, findNativeClass, nativeMethods, nativeFields } from '../src/ftc-mock/registry';
import { STRING_METHODS } from '../src/ftc-mock/javalang';
import { parse } from '../src/runtime/java/parser';
import { playWatch } from '../src/sim/watch';
import { BANNED_WORDS, EMOJI, longWords, wordCount } from './helpers/prose';

const pathway = loadPathway();
const locations = lessonLocations();
const built = locations.filter((l) => existsSync(l.abs) && missingFiles(l.abs).length === 0);
const lessons = loadAllLessons();

/* These tests are the contract in CLAUDE.md turned into a gate. A lesson is not done
   until they pass, which is why they run on a partial build: whatever exists is checked,
   and the completeness test below is the one that fails while tiers are outstanding. */

describe('pathway.json', () => {
  it('describes six tiers and 42 lessons', () => {
    expect(pathway.tiers).toHaveLength(6);
    expect(locations).toHaveLength(42);
  });

  it('gives every lesson a unique id', () => {
    const ids = locations.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('names a checkpoint in each tier, and it is that tier is last lesson', () => {
    for (const t of pathway.tiers) {
      expect(t.lessons.map((l) => l.id)).toContain(t.checkpoint);
      expect(t.lessons[t.lessons.length - 1]!.id).toBe(t.checkpoint);
    }
  });

  it('has no lesson folder on disk that it does not list', () => {
    const listed = new Set(locations.map((l) => l.dir));
    const orphans = lessonFoldersOnDisk().filter((d) => !listed.has(d));
    expect(orphans, 'these folders exist but pathway.json never mentions them').toEqual([]);
  });

  it('uses the hardware names CLAUDE.md fixes across all tiers', () => {
    expect(pathway.robotNames.tank).toContain('leftDrive');
    expect(pathway.robotNames.tank).toContain('rightDrive');
    expect(pathway.robotNames.mecanum).toEqual(
      expect.arrayContaining(['frontLeft', 'frontRight', 'backLeft', 'backRight']),
    );
    for (const names of Object.values(pathway.robotNames)) {
      expect(names).toEqual(expect.arrayContaining(['armMotor', 'clawServo', 'distanceSensor', 'colorSensor', 'imu']));
    }
  });
});

describe('every lesson folder has the six files', () => {
  for (const loc of locations) {
    it(`${loc.dir}`, () => {
      expect(existsSync(loc.abs), `${loc.dir} does not exist yet`).toBe(true);
      expect(missingFiles(loc.abs), `${loc.dir} is missing files`).toEqual([]);
    });
  }
});

describe.each(built.map((l) => [l.dir, l] as const))('%s', (_dir, loc) => {
  const lesson = loadLesson(loc);
  const { frontmatter: fm, sections } = lesson;
  const tier = pathway.tiers.find((t) => t.tier === loc.tier)!;

  it('frontmatter agrees with pathway.json', () => {
    expect(fm.id).toBe(loc.id);
    expect(fm.tier).toBe(loc.tier);
    expect(fm.robot).toBe(tier.robot);
    expect(fm.title.length).toBeGreaterThan(2);
    expect(fm.concept.length).toBeGreaterThan(10);
    expect(fm.minutes).toBeGreaterThanOrEqual(5);
    expect(fm.minutes).toBeLessThanOrEqual(60);
  });

  it('has all six sections, each with something in it', () => {
    for (const name of SECTION_ORDER) {
      expect(sections[name].trim().length, `${name} is empty`).toBeGreaterThan(0);
    }
  });

  it('states the mission in one sentence', () => {
    const sentences = sections.mission.trim().replace(/\n+/g, ' ').split(/(?<=[.!?])\s+/).filter(Boolean);
    expect(sentences.length, `Mission should be one sentence, found ${sentences.length}`).toBe(1);
    expect(wordCount(sections.mission)).toBeLessThanOrEqual(25);
  });

  it('keeps the Learn section inside the Explorer word budget', () => {
    expect(wordCount(sections.learn), 'CLAUDE.md caps Explorer Learn at 150 words').toBeLessThanOrEqual(150);
  });

  it('uses no word over three syllables that is not a taught term', () => {
    const taught = [
      ...boldedTerms(sections.learn),
      ...boldedTerms(sections.mission),
      ...glossaryTerms(),
    ];
    expect(longWords(sections.learn, taught)).toEqual([]);
  });

  it('keeps the Builder "why" panel under 250 words', () => {
    if (sections.why) expect(wordCount(sections.why)).toBeLessThanOrEqual(250);
  });

  it('never says simply, just, easy or obviously, and uses no emoji', () => {
    for (const name of [...SECTION_ORDER, 'why'] as const) {
      const text = sections[name];
      if (!text) continue;
      const banned = BANNED_WORDS.exec(text);
      expect(banned?.[0], `${name} section uses "${banned?.[0]}"`).toBeUndefined();
      expect(EMOJI.test(text), `${name} section contains an emoji`).toBe(false);
    }
    for (const h of lesson.hints.hints) {
      expect(BANNED_WORDS.test(h), `a hint uses a banned word: ${h}`).toBe(false);
    }
  });

  it('bolds only terms that content/glossary.md defines', () => {
    const terms = boldedTerms(sections.learn);
    if (!terms.length) return;
    const glossary = readContentFile('glossary.md').toLowerCase();
    const missing = terms.filter((t) => !glossary.includes(`## ${t.toLowerCase()}`));
    expect(missing, 'add these to content/glossary.md').toEqual([]);
  });

  it('has exactly three hints, each of them useful', () => {
    expect(lesson.hints.hints).toHaveLength(3);
    for (const h of lesson.hints.hints) expect(h.trim().length).toBeGreaterThan(15);
  });

  it('has a starter that parses, contains a TODO, and is not the solution', () => {
    const { diagnostics } = parse(lesson.starter);
    expect(diagnostics, `starter.java does not parse: ${JSON.stringify(diagnostics)}`).toEqual([]);
    expect(lesson.starter, 'starter.java needs at least one // TODO marker').toMatch(/\/\/\s*TODO/);
    expect(lesson.starter.trim()).not.toBe(lesson.solution.trim());
  });

  it('has a solution that parses and keeps no TODO behind', () => {
    const { diagnostics } = parse(lesson.solution);
    expect(diagnostics, `solution.java does not parse: ${JSON.stringify(diagnostics)}`).toEqual([]);
    expect(lesson.solution).not.toMatch(/\/\/\s*TODO/);
  });

  it('locks only line ranges that exist in starter.java', () => {
    const lines = lesson.starter.split('\n').length;
    for (const [from, to] of fm.explorerLockedRanges) {
      expect(from).toBeGreaterThanOrEqual(1);
      expect(to).toBeGreaterThanOrEqual(from);
      expect(to, `locked range ends past the end of starter.java (${lines} lines)`).toBeLessThanOrEqual(lines);
    }
  });

  it('leaves every TODO line editable in Explorer mode', () => {
    const locked = (line: number) => fm.explorerLockedRanges.some(([a, b]) => line >= a && line <= b);
    lesson.starter.split('\n').forEach((text, i) => {
      if (/\/\/\s*TODO/.test(text)) {
        expect(locked(i + 1), `line ${i + 1} is a TODO but Explorer mode locks it`).toBe(false);
      }
    });
  });

  it('has tests.json with real checks the runner knows', () => {
    expect(lesson.tests.checks.length, 'a lesson needs at least one check').toBeGreaterThan(0);
    for (const c of lesson.tests.checks) {
      expect(CHECK_TYPES, `unknown check type "${c.type}"`).toContain(c.type);
    }
    if (lesson.tests.robot) expect(lesson.tests.robot).toBe(tier.robot);
  });

  it('has a watch.json demo that plays', () => {
    expect(lesson.watch.robot).toBe(tier.robot);
    expect(lesson.watch.durationMs).toBeGreaterThan(500);
    expect(lesson.watch.durationMs).toBeLessThanOrEqual(20_000);
    expect(lesson.watch.steps.length).toBeGreaterThan(0);
    const frames = playWatch(lesson.watch);
    expect(frames.length).toBeGreaterThan(10);
    expect(frames[frames.length - 1]!.snapshot.timeMs).toBeGreaterThanOrEqual(lesson.watch.durationMs - 20);
  });

  it('calls nothing outside docs/FTC_MOCK_COVERAGE.md', () => {
    for (const [file, source] of [['starter.java', lesson.starter], ['solution.java', lesson.solution]] as const) {
      const unknown = unknownSdkCalls(source);
      expect(unknown, `${file} calls something that is not mocked`).toEqual([]);
    }
  });
});

describe('content/ supporting files', () => {
  it('has a glossary', () => {
    expect(contentFileExists('glossary.md')).toBe(true);
    expect(readContentFile('glossary.md')).toMatch(/^##\s+/m);
  });

  it('has a mentor guide for every tier', () => {
    for (const t of pathway.tiers) {
      expect(contentFileExists(`mentor/tier-${t.tier}.md`), `content/mentor/tier-${t.tier}.md is missing`).toBe(true);
    }
  });

  it('holds only Markdown, Java and JSON, as CLAUDE.md requires', () => {
    // The design lint checks this across the repo; this is the content-side assertion.
    const bad = lessonFoldersOnDisk().filter((d) => /\.(ts|js|py|html|css)$/.test(d));
    expect(bad).toEqual([]);
  });
});

describe('the whole pathway is built', () => {
  it('has all 42 lessons present', () => {
    const outstanding = locations.filter((l) => !built.includes(l)).map((l) => l.dir);
    expect(outstanding, 'lessons still to write').toEqual([]);
  });

  it('covers every tier with at least one lesson that moves the robot', () => {
    for (const t of pathway.tiers) {
      const tierLessons = lessons.filter((l) => l.frontmatter.tier === t.tier);
      if (!tierLessons.length) continue;
      const movesSomething = tierLessons.some((l) =>
        l.tests.checks.some((c) =>
          ['robotMovedAtLeastCm', 'robotWithinCmOf', 'robotHeadingWithin', 'motorPowerEverExceeded', 'servoReached'].includes(c.type),
        ),
      );
      expect(movesSomething, `tier ${t.tier} never checks that the robot does anything`).toBe(true);
    }
  });
});

/* --------------------------------------------------------------- helpers */

let glossaryCache: string[] | null = null;

/** Every term content/glossary.md defines. A term taught once stays taught. */
function glossaryTerms(): string[] {
  if (!glossaryCache) {
    glossaryCache = [...readContentFile('glossary.md').matchAll(/^##\s+(.+)$/gm)].map((m) =>
      m[1]!.trim(),
    );
  }
  return glossaryCache;
}

/** Method and field names used in a lesson that the mocked SDK does not provide. */
function unknownSdkCalls(source: string): string[] {
  const { unit } = parse(source);
  const known = new Set<string>();
  for (const key of coverageKeys()) known.add(key.split('.').pop()!);
  for (const name of Object.keys(STRING_METHODS)) known.add(name);
  // Inherited names reachable from the classes a lesson extends.
  for (const cls of ['OpMode', 'LinearOpMode', 'DcMotor', 'DcMotorEx', 'Servo', 'CRServo', 'Telemetry', 'IMU']) {
    const native = findNativeClass(cls);
    if (!native) continue;
    for (const m of nativeMethods(native)) known.add(m.name);
    for (const f of nativeFields(native)) known.add(f.name);
  }
  // Anything the lesson defines itself, plus Java's own universals.
  const declared = new Set<string>(['main', 'length', 'values', 'ordinal', 'name', 'toString', 'equals', 'hashCode', 'class']);
  const walkTypes = (t: typeof unit.types[number]): void => {
    declared.add(t.name);
    for (const m of [...t.methods, ...t.constructors]) declared.add(m.name);
    for (const f of t.fields) declared.add(f.name);
    for (const c of t.enumConstants) declared.add(c.name);
    t.nested.forEach(walkTypes);
  };
  unit.types.forEach(walkTypes);

  // Strip what is not code before scanning. Package lines are dotted, and prose inside a
  // comment ("turn left. leftDrive -0.5") reads exactly like a field access once the
  // regex allows whitespace after the dot.
  const body = source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ')
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/^\s*(?:package|import)\b.*$/gm, '');

  // Locals and parameters are fine; we only care about dotted member access and calls.
  const used = new Set<string>();
  for (const m of body.matchAll(/\.\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g)) used.add(m[1]!);
  for (const m of body.matchAll(/\.\s*([a-z_$][A-Za-z0-9_$]*)\b(?!\s*\()/g)) used.add(m[1]!);

  return [...used].filter((n) => !known.has(n) && !declared.has(n)).sort();
}
