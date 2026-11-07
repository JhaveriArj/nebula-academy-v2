import { SECTION_ORDER, type LessonFrontmatter, type LessonSections, type SectionName } from './types';

/* Parses lesson.md: a small frontmatter block then the six `## ` sections.

   Hand-rolled rather than pulling in a YAML parser, because the frontmatter has six
   fixed keys and docs/ARCHITECTURE.md caps dependencies. A malformed lesson fails loudly
   with the file named, since tests/content.test.ts is what a mentor will see. */

export class LessonParseError extends Error {}

export function parseLessonMarkdown(
  source: string,
  where: string,
): { frontmatter: LessonFrontmatter; sections: LessonSections } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(source.replace(/^﻿/, ''));
  if (!match) {
    throw new LessonParseError(`${where}: lesson.md must start with a --- frontmatter block.`);
  }
  const frontmatter = parseFrontmatter(match[1]!, where);
  const sections = parseSections(match[2]!, where);
  return { frontmatter, sections };
}

function parseFrontmatter(block: string, where: string): LessonFrontmatter {
  const raw: Record<string, string> = {};
  for (const line of block.split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const i = line.indexOf(':');
    if (i < 0) throw new LessonParseError(`${where}: frontmatter line is not "key: value": ${line}`);
    raw[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }

  const need = (key: string): string => {
    const v = raw[key];
    if (v === undefined || v === '') throw new LessonParseError(`${where}: frontmatter is missing ${key}.`);
    return v;
  };

  const robot = need('robot');
  if (robot !== 'tank' && robot !== 'mecanum') {
    throw new LessonParseError(`${where}: robot must be tank or mecanum, not "${robot}".`);
  }

  const tier = Number(need('tier'));
  const minutes = Number(need('minutes'));
  if (!Number.isInteger(tier) || tier < 0 || tier > 5) {
    throw new LessonParseError(`${where}: tier must be 0 to 5.`);
  }
  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw new LessonParseError(`${where}: minutes must be a positive number.`);
  }

  let ranges: [number, number][] = [];
  if (raw['explorerLockedRanges']) {
    try {
      const parsed = JSON.parse(raw['explorerLockedRanges']) as unknown;
      if (!Array.isArray(parsed)) throw new Error('not an array');
      ranges = parsed.map((pair) => {
        if (!Array.isArray(pair) || pair.length !== 2 || !pair.every((n) => Number.isInteger(n))) {
          throw new Error('each range is a [startLine, endLine] pair of whole numbers');
        }
        return [pair[0] as number, pair[1] as number];
      });
    } catch (e) {
      throw new LessonParseError(
        `${where}: explorerLockedRanges should look like [[1, 16], [22, 28]] — ${(e as Error).message}`,
      );
    }
  }

  return {
    id: need('id'),
    title: need('title').replace(/^["']|["']$/g, ''),
    tier,
    minutes,
    concept: need('concept').replace(/^["']|["']$/g, ''),
    robot,
    explorerLockedRanges: ranges,
  };
}

function parseSections(body: string, where: string): LessonSections {
  const found = new Map<string, string>();
  const parts = body.split(/^##\s+/m);
  for (const part of parts.slice(1)) {
    const newline = part.indexOf('\n');
    const heading = (newline < 0 ? part : part.slice(0, newline)).trim().toLowerCase();
    const text = newline < 0 ? '' : part.slice(newline + 1);
    found.set(heading, text.trim());
  }

  const missing = SECTION_ORDER.filter((s) => !found.has(s));
  if (missing.length) {
    throw new LessonParseError(
      `${where}: lesson.md is missing the ${missing.join(', ')} section${missing.length === 1 ? '' : 's'}. ` +
        `Every lesson has all six, in this order: ${SECTION_ORDER.join(', ')}.`,
    );
  }

  // The order on the page is the order a kid moves through, so enforce it.
  const headings = [...found.keys()].filter((h) => (SECTION_ORDER as readonly string[]).includes(h));
  const expected = SECTION_ORDER.filter((s) => headings.includes(s));
  if (headings.join(',') !== expected.join(',')) {
    throw new LessonParseError(
      `${where}: sections are out of order (${headings.join(', ')}). The order is ${SECTION_ORDER.join(', ')}.`,
    );
  }

  const sections = {} as LessonSections;
  let why: string | null = null;
  for (const name of SECTION_ORDER) {
    const { text, panel } = extractWhyPanel(found.get(name)!);
    sections[name as SectionName] = text;
    if (panel) why = why ? `${why}\n\n${panel}` : panel;
  }
  sections.why = why;
  return sections;
}

/** Pulls a `:::why ... :::` block out of a section. Builder sees it; Explorer does not. */
export function extractWhyPanel(text: string): { text: string; panel: string | null } {
  const re = /^:::why\s*$([\s\S]*?)^:::\s*$/m;
  const m = re.exec(text);
  if (!m) return { text, panel: null };
  return {
    text: (text.slice(0, m.index) + text.slice(m.index + m[0].length)).replace(/\n{3,}/g, '\n\n').trim(),
    panel: m[1]!.trim(),
  };
}

/** Every term a Learn section bolds, which must all appear in content/glossary.md. */
export function boldedTerms(text: string): string[] {
  return [...text.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1]!.trim()).filter(Boolean);
}
