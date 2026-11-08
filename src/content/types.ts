import type { TestSpec } from '../runtime/testRunner';
import type { WatchSpec } from '../sim/watch';
import type { RobotKind } from '../sim/simulation';

/** The six parts every lesson has, in this order. */
export const SECTION_ORDER = ['mission', 'watch', 'learn', 'try', 'check', 'boost'] as const;
export type SectionName = (typeof SECTION_ORDER)[number];

export interface LessonFrontmatter {
  id: string;
  title: string;
  tier: number;
  minutes: number;
  concept: string;
  robot: RobotKind;
  /** Inclusive 1-based line ranges of starter.java that Explorer mode locks. */
  explorerLockedRanges: [number, number][];
}

export type LessonSections = Record<SectionName, string> & {
  /** The ::: why panel, rendered as "Why this works" for Builder only. */
  why: string | null;
};

export interface Hints {
  /** Exactly three, then "show solution". Enforced by tests/content.test.ts. */
  hints: string[];
}

export interface Lesson {
  frontmatter: LessonFrontmatter;
  sections: LessonSections;
  starter: string;
  solution: string;
  tests: TestSpec;
  watch: WatchSpec;
  hints: Hints;
  /** Path relative to content/, for error messages. */
  dir: string;
}

export interface PathwayLesson {
  id: string;
  dir: string;
  /** Mirrors the lesson.md frontmatter title so the chart index can be read without
      loading 42 lessons. tests/content.test.ts checks the two never drift apart. */
  title: string;
}

export interface PathwayTier {
  tier: number;
  slug: string;
  name: string;
  subtitle: string;
  robot: RobotKind;
  badge: string;
  /** Where this tier's station sits on the Level Map star chart. */
  station: { x: number; y: number };
  lessons: PathwayLesson[];
  checkpoint: string;
}

export interface Pathway {
  robotNames: Record<RobotKind, string[]>;
  tiers: PathwayTier[];
}

/** The six files a lesson folder must contain. */
export const LESSON_FILES = [
  'lesson.md', 'starter.java', 'solution.java', 'tests.json', 'watch.json', 'hints.json',
] as const;
