import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLessonMarkdown } from '../../src/content/parse';
import { LESSON_FILES, type Lesson, type Pathway } from '../../src/content/types';
import type { TestSpec } from '../../src/runtime/testRunner';
import type { WatchSpec } from '../../src/sim/watch';

/* Reads content/ straight off disk. The browser uses src/content/loader.ts instead, but
   both end up with the same Lesson shape, so a lesson that passes here is the lesson the
   kid gets. */

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CONTENT = join(ROOT, 'content');

export function loadPathway(): Pathway {
  return JSON.parse(readFileSync(join(CONTENT, 'pathway.json'), 'utf8')) as Pathway;
}

export interface LessonLocation {
  id: string;
  tier: number;
  tierSlug: string;
  dir: string;
  abs: string;
}

/** Every lesson pathway.json points at, in pathway order. */
export function lessonLocations(): LessonLocation[] {
  const pathway = loadPathway();
  return pathway.tiers.flatMap((t) =>
    t.lessons.map((l) => ({
      id: l.id,
      tier: t.tier,
      tierSlug: t.slug,
      dir: `tiers/${t.slug}/${l.dir}`,
      abs: join(CONTENT, 'tiers', t.slug, l.dir),
    })),
  );
}

/** Lesson folders that exist on disk, whether or not pathway.json lists them. */
export function lessonFoldersOnDisk(): string[] {
  const tiers = join(CONTENT, 'tiers');
  if (!existsSync(tiers)) return [];
  const out: string[] = [];
  for (const tier of readdirSync(tiers)) {
    const tierDir = join(tiers, tier);
    if (!statSync(tierDir).isDirectory()) continue;
    for (const lesson of readdirSync(tierDir)) {
      const p = join(tierDir, lesson);
      if (statSync(p).isDirectory()) out.push(`tiers/${tier}/${lesson}`);
    }
  }
  return out.sort();
}

export function missingFiles(abs: string): string[] {
  return LESSON_FILES.filter((f) => !existsSync(join(abs, f)));
}

export function loadLesson(loc: LessonLocation): Lesson {
  const read = (file: string) => readFileSync(join(loc.abs, file), 'utf8');
  const json = <T>(file: string): T => {
    try {
      return JSON.parse(read(file)) as T;
    } catch (e) {
      throw new Error(`${loc.dir}/${file} is not valid JSON: ${(e as Error).message}`);
    }
  };
  const { frontmatter, sections } = parseLessonMarkdown(read('lesson.md'), loc.dir);
  return {
    frontmatter,
    sections,
    starter: read('starter.java'),
    solution: read('solution.java'),
    tests: json<TestSpec>('tests.json'),
    watch: json<WatchSpec>('watch.json'),
    hints: json<{ hints: string[] }>('hints.json'),
    dir: loc.dir,
  };
}

/** Every lesson that is fully present on disk. Lets tests run against a partial build. */
export function loadAllLessons(): Lesson[] {
  return lessonLocations()
    .filter((l) => existsSync(l.abs) && missingFiles(l.abs).length === 0)
    .map(loadLesson);
}

export function readContentFile(relative: string): string {
  return readFileSync(join(CONTENT, relative), 'utf8');
}

export const contentFileExists = (relative: string) => existsSync(join(CONTENT, relative));
