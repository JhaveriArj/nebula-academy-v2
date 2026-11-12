import { parseLessonMarkdown } from './parse';
import { LESSON_FILES, type Lesson, type Pathway, type PathwayTier } from './types';
import pathwayJson from '../../content/pathway.json';
import type { TestSpec } from '../runtime/testRunner';
import type { WatchSpec } from '../sim/watch';

/* The browser side of the content system. Lesson files are pulled in lazily by Vite's
   glob so the Level Map does not download 42 lessons to draw six stations. */

const files = import.meta.glob('../../content/**/*.{md,java,json}', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

/** Glob keys are relative to this module; index them by their content/ path instead. */
const byContentPath = new Map<string, () => Promise<string>>();
for (const [key, load] of Object.entries(files)) {
  const i = key.indexOf('content/');
  if (i >= 0) byContentPath.set(key.slice(i + 'content/'.length), load);
}

export const pathway = pathwayJson as unknown as Pathway;

export function tierOf(lessonId: string): PathwayTier | undefined {
  return pathway.tiers.find((t) => t.lessons.some((l) => l.id === lessonId));
}

export function lessonDir(lessonId: string): string | undefined {
  for (const t of pathway.tiers) {
    const l = t.lessons.find((x) => x.id === lessonId);
    if (l) return `tiers/${t.slug}/${l.dir}`;
  }
  return undefined;
}

export function allLessonIds(): string[] {
  return pathway.tiers.flatMap((t) => t.lessons.map((l) => l.id));
}

/** The lesson after this one, across tier boundaries, or null at the end. */
export function nextLessonId(lessonId: string): string | null {
  const ids = allLessonIds();
  const i = ids.indexOf(lessonId);
  return i >= 0 && i + 1 < ids.length ? ids[i + 1]! : null;
}

const cache = new Map<string, Promise<Lesson>>();

export function loadLesson(lessonId: string): Promise<Lesson> {
  const existing = cache.get(lessonId);
  if (existing) return existing;
  const promise = fetchLesson(lessonId);
  cache.set(lessonId, promise);
  return promise;
}

async function fetchLesson(lessonId: string): Promise<Lesson> {
  const dir = lessonDir(lessonId);
  if (!dir) throw new Error(`pathway.json has no lesson called ${lessonId}.`);

  const read = async (file: string): Promise<string> => {
    const load = byContentPath.get(`${dir}/${file}`);
    if (!load) throw new Error(`${dir}/${file} is missing. A lesson needs all of: ${LESSON_FILES.join(', ')}.`);
    return load();
  };

  const [md, starter, solution, tests, watch, hints] = await Promise.all(
    LESSON_FILES.map((f) => read(f)),
  );
  const { frontmatter, sections } = parseLessonMarkdown(md!, dir);
  return {
    frontmatter,
    sections,
    starter: starter!,
    solution: solution!,
    tests: JSON.parse(tests!) as TestSpec,
    watch: JSON.parse(watch!) as WatchSpec,
    hints: JSON.parse(hints!) as { hints: string[] },
    dir,
  };
}

/** content/glossary.md, content/mentor/tier-N.md and friends. */
export async function loadContentFile(relativePath: string): Promise<string> {
  const load = byContentPath.get(relativePath);
  if (!load) throw new Error(`content/${relativePath} is missing.`);
  return load();
}

export const hasContentFile = (relativePath: string) => byContentPath.has(relativePath);
