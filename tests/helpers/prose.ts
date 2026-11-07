/* Helpers for enforcing the CLAUDE.md voice rules at test time rather than at review
   time, because voice is the thing that quietly rots across 42 lessons. */

/** Markdown stripped down to the words a kid actually reads. */
export function plainWords(markdown: string): string[] {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_>#|]/g, ' ')
    .replace(/:::\w*/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  return text.split(/[^A-Za-z'-]+/).filter(Boolean);
}

export function wordCount(markdown: string): number {
  return plainWords(markdown).length;
}

/* A vowel-group heuristic. It is not linguistics, but it reliably separates "motor" from
   "initialization", which is all the rule needs it to do. */
export function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return 1;
  const trimmed = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
    .replace(/^y/, '');
  const groups = trimmed.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

export const JAVA_KEYWORDS = new Set([
  'abstract', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'continue',
  'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float', 'for',
  'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'new', 'package',
  'private', 'protected', 'public', 'return', 'short', 'static', 'super', 'switch', 'this',
  'throw', 'throws', 'try', 'void', 'while', 'true', 'false', 'null', 'println', 'telemetry',
  'opmode', 'teleop', 'autonomous', 'hardwaremap', 'gamepad', 'servo', 'encoder', 'imu',
  'linearopmode', 'setpower', 'mecanum', 'java', 'nebula',
]);

/* Words a nine-year-old meets in this project whose meaning is taught where it appears,
   so the three-syllable rule does not need to exclude them. Keeping this list short and
   explicit is the point: every addition is a decision, not a drift. */
export const ALLOWED_LONG_WORDS = new Set([
  'robot', 'motor', 'motors', 'robots', 'semicolon', 'semicolons', 'computer', 'simulator',
  'operator', 'operators', 'everything', 'anything', 'remember', 'remembers', 'together',
  'another', 'different', 'exactly', 'already', 'position', 'direction', 'directions',
  'instruction', 'instructions', 'repeating', 'repeated', 'capital', 'capitals',
  'potato', 'sensor', 'sensors', 'battery', 'tomorrow', 'parameter', 'parameters',
  'driver', 'station', 'controller', 'controllers', 'decimal', 'decimals', 'negative',
  'positive', 'however', 'without', 'underneath', 'opposite', 'carefully', 'usually',
  'probably', 'definitely', 'immediately', 'certainly', 'suddenly', 'finally',
  'autonomous', 'configuration', 'proportional', 'organisation', 'organization',
  'celebration', 'experiment', 'experiments', 'beginning', 'continues', 'continue',
  'number', 'numbers', 'letter', 'letters', 'second', 'seconds', 'forever', 'into',
  'about', 'above', 'under', 'over', 'power', 'powers', 'faster', 'slower', 'bigger',
  'smaller', 'wheel', 'wheels', 'arjun', 'nebula', 'checkpoint', 'checkpoints',
  'launchpad', 'orbit', 'docking', 'tier', 'tiers', 'lesson', 'lessons', 'mission',
  'missions', 'android', 'studio', 'github', 'degrees', 'degree', 'angle', 'angles',
  'centimetre', 'centimetres', 'centimeter', 'centimeters', 'distance', 'distances',
  'colour', 'colours', 'color', 'colors', 'console',
]);

export const BANNED_WORDS = /\b(simply|just|easy|easier|easiest|easily|obviously|obvious|of course|merely|trivial|trivially)\b/i;

/** Emoji and pictographs, which CLAUDE.md bans from the UI and lesson prose alike. */
export const EMOJI =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]|\u{FE0F}/u;

export function longWords(markdown: string, extraAllowed: Iterable<string> = []): string[] {
  const allowed = new Set([...ALLOWED_LONG_WORDS, ...[...extraAllowed].map((w) => w.toLowerCase())]);
  return plainWords(markdown).filter((raw) => {
    const w = raw.toLowerCase().replace(/[^a-z]/g, '');
    if (!w || allowed.has(w) || JAVA_KEYWORDS.has(w)) return false;
    return syllables(w) > 3;
  });
}
