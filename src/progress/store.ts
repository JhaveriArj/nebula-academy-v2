import { pathway } from '../content/loader';

/* Progress lives in localStorage with file export and import, because CLAUDE.md rules out
   a backend and school Chromebooks get wiped. Drafts are kept too: a kid who closes the
   lid mid-lesson should find their code where they left it. */

export type Mode = 'explorer' | 'builder';

export interface LessonProgress {
  passed: boolean;
  /** ISO timestamp of the first pass. */
  passedAt: string | null;
  /** Which mode it was passed in, for the mentor's benefit. */
  mode: Mode;
}

export interface ProgressFile {
  version: 1;
  savedAt: string;
  mode: Mode;
  /** Whether the kid has picked Explorer or Builder themselves. Until then the home page
   *  asks their age instead of quietly starting a nine-year-old in Builder. */
  modeChosen: boolean;
  bigType: boolean;
  lessons: Record<string, LessonProgress>;
  /** lessonId -> the kid's current code. */
  drafts: Record<string, string>;
}

const KEY = 'nebula.progress.v1';
/** A draft over this size is almost certainly a paste accident, not a lesson. */
const MAX_DRAFT = 40_000;

const empty = (): ProgressFile => ({
  version: 1,
  savedAt: new Date().toISOString(),
  mode: 'builder',
  modeChosen: false,
  bigType: false,
  lessons: {},
  drafts: {},
});

let cache: ProgressFile | null = null;

/** localStorage throws in private windows and when site data is blocked. */
function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function load(): ProgressFile {
  if (cache) return cache;
  const raw = readRaw();
  if (!raw) {
    cache = empty();
    return cache;
  }
  try {
    cache = normalise(JSON.parse(raw));
  } catch {
    cache = empty();
  }
  return cache;
}

function save(): void {
  if (!cache) return;
  cache.savedAt = new Date().toISOString();
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Out of space or blocked. The session keeps working from memory.
  }
}

/** Accepts anything and returns something usable, so an edited file cannot break the app. */
export function normalise(input: unknown): ProgressFile {
  const file = empty();
  if (typeof input !== 'object' || input === null) return file;
  const raw = input as Partial<ProgressFile>;
  if (raw.mode === 'explorer' || raw.mode === 'builder') file.mode = raw.mode;
  // Files saved before this field existed: anyone who has passed a lesson has already chosen.
  file.modeChosen = raw.modeChosen === true
    || Object.values(raw.lessons ?? {}).some((l) => typeof l === 'object' && l !== null && (l as Partial<LessonProgress>).passed === true);
  file.bigType = raw.bigType === true;

  const known = new Set(pathway.tiers.flatMap((t) => t.lessons.map((l) => l.id)));
  for (const [id, value] of Object.entries(raw.lessons ?? {})) {
    if (!known.has(id) || typeof value !== 'object' || value === null) continue;
    const entry = value as Partial<LessonProgress>;
    file.lessons[id] = {
      passed: entry.passed === true,
      passedAt: typeof entry.passedAt === 'string' ? entry.passedAt : null,
      mode: entry.mode === 'explorer' ? 'explorer' : 'builder',
    };
  }
  for (const [id, code] of Object.entries(raw.drafts ?? {})) {
    if (known.has(id) && typeof code === 'string' && code.length <= MAX_DRAFT) {
      file.drafts[id] = code;
    }
  }
  return file;
}

export const getMode = (): Mode => load().mode;

export function setMode(mode: Mode): void {
  const file = load();
  file.mode = mode;
  file.modeChosen = true;
  save();
}

export const hasChosenMode = (): boolean => load().modeChosen;

export const getBigType = (): boolean => load().bigType;

export function setBigType(on: boolean): void {
  load().bigType = on;
  save();
}

export const isPassed = (lessonId: string): boolean => load().lessons[lessonId]?.passed === true;

export function markPassed(lessonId: string): boolean {
  const file = load();
  if (file.lessons[lessonId]?.passed) return false;
  file.lessons[lessonId] = { passed: true, passedAt: new Date().toISOString(), mode: file.mode };
  save();
  return true; // newly passed, so the Level Map should animate
}

export const getDraft = (lessonId: string): string | null => load().drafts[lessonId] ?? null;

export function setDraft(lessonId: string, code: string): void {
  const file = load();
  if (code.length > MAX_DRAFT) return;
  file.drafts[lessonId] = code;
  save();
}

export function clearDraft(lessonId: string): void {
  delete load().drafts[lessonId];
  save();
}

/** A tier opens when the previous tier's checkpoint passes. Tier 0 is never locked. */
export function isTierUnlocked(tier: number): boolean {
  if (tier <= 0) return true;
  const previous = pathway.tiers.find((t) => t.tier === tier - 1);
  return previous ? isPassed(previous.checkpoint) : true;
}

export function isLessonUnlocked(lessonId: string): boolean {
  const tier = pathway.tiers.find((t) => t.lessons.some((l) => l.id === lessonId));
  return tier ? isTierUnlocked(tier.tier) : true;
}

export function counts(): { passed: number; total: number } {
  const total = pathway.tiers.reduce((n, t) => n + t.lessons.length, 0);
  const passed = pathway.tiers.reduce(
    (n, t) => n + t.lessons.filter((l) => isPassed(l.id)).length,
    0,
  );
  return { passed, total };
}

export function tierCounts(tier: number): { passed: number; total: number } {
  const entry = pathway.tiers.find((t) => t.tier === tier);
  if (!entry) return { passed: 0, total: 0 };
  return {
    passed: entry.lessons.filter((l) => isPassed(l.id)).length,
    total: entry.lessons.length,
  };
}

export function exportJson(): string {
  return JSON.stringify(load(), null, 2);
}

export function importJson(text: string): { ok: true } | { ok: false; reason: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'That file is not the one Nebula saved. It should end in .json.' };
  }
  if (typeof parsed !== 'object' || parsed === null || (parsed as { version?: number }).version !== 1) {
    return { ok: false, reason: 'That file came from a different version of Nebula.' };
  }
  cache = normalise(parsed);
  save();
  return { ok: true };
}

export function reset(): void {
  cache = empty();
  save();
}

/** Only for tests. */
export function _resetCache(): void {
  cache = null;
}
