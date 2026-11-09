import { formatDiagnostic, type Diagnostic, type JavaThrow } from './java/diagnostics';
import type { MissingImport } from './java/imports';
import type { RunStopReason } from './java/interpreter';

/* Turns a compiler diagnostic or a Java exception into something a nine-year-old can act
   on, while keeping the real text available behind "Show the real error".

   Voice rules from CLAUDE.md: the robot got confused, never the kid was wrong. No
   "simply", "just", "easy" or "obviously". Every message carries the line number and
   the likely fix, because "cannot find symbol" on its own teaches nothing. */

export interface FriendlyError {
  kind: 'compile' | 'runtime' | 'limit';
  /** One sentence, Explorer-readable. */
  headline: string;
  /** The likely fix, or null when we genuinely cannot guess. */
  fix: string | null;
  line: number | null;
  column: number | null;
  /** The original javac or JVM text, for the "Show the real error" toggle. */
  raw: string;
}

const BANNED = /\b(simply|just|easy|easily|obviously|of course)\b/i;

/** Guards the voice rules in CLAUDE.md at test time rather than at review time. */
export function violatesVoice(text: string): boolean {
  return BANNED.test(text);
}

export function translateDiagnostic(d: Diagnostic, source: string): FriendlyError {
  const raw = formatDiagnostic(d, 'Main.java', source);
  const at = d.line;
  const base = { kind: 'compile' as const, line: at, column: d.column, raw };

  switch (d.code) {
    case 'expected': {
      const token = /'(.+?)' expected/.exec(d.message)?.[1];
      if (token === ';') {
        return {
          ...base,
          headline: `Line ${at} needs a semicolon at the end.`,
          fix: 'Every instruction you give the robot finishes with a ; so it knows where one step stops and the next begins.',
        };
      }
      if (token === ')') {
        return {
          ...base,
          headline: `Line ${at} has an opening ( that never closes.`,
          fix: 'Count the ( and ) on this line. There should be one ) for every (.',
        };
      }
      if (token === '}') {
        return {
          ...base,
          headline: `Line ${at} needs a closing } brace.`,
          fix: 'Every { that opens a block needs a } to close it.',
        };
      }
      return {
        ...base,
        headline: `Line ${at} is missing a ${token ?? 'piece of punctuation'}.`,
        fix: `Java was looking for ${token ?? 'something'} here.`,
      };
    }

    case 'premature.eof':
      return {
        ...base,
        headline: 'Your program ends before all its braces are closed.',
        fix: 'Scroll to the bottom and count the } braces. Each { that opens a class, a method or a loop needs one.',
      };

    case 'unclosed.string.literal':
      return {
        ...base,
        headline: `A piece of text on line ${at} is missing its closing quote mark.`,
        fix: 'Text the robot says always has a " at the start and a " at the end, like "Hello".',
      };

    case 'unclosed.comment':
      return {
        ...base,
        headline: `The note you started on line ${at} never finishes.`,
        fix: 'A /* note needs a */ to close it.',
      };

    case 'illegal.char':
      return {
        ...base,
        headline: `Line ${at} has a character Java does not understand: ${d.symbol ?? ''}`,
        fix: 'This often happens when a smart quote (" or ") is pasted in. Retype it with a straight " instead.',
      };

    case 'illegal.start.of.expression':
      return {
        ...base,
        headline: `Line ${at} starts in a way Java did not expect.`,
        fix: 'Check the line above for a missing semicolon or an extra bracket, because that is usually where this really begins.',
      };

    case 'class.expected':
      return {
        ...base,
        headline: `Line ${at} is outside any class.`,
        fix: 'All your code lives inside the class { } block. Check that you have not closed a } too early.',
      };

    case 'cant.resolve':
    case 'cant.resolve.location':
    case 'cant.resolve.method': {
      const what = d.detail?.[0] ?? '';
      const symbol = d.symbol ?? 'that name';
      const suggestion = suggest(symbol, source);
      const isMethod = /method/.test(what);
      const isClass = /class/.test(what);
      const noun = isMethod ? 'anything it can do called' : isClass ? 'a kind of thing called' : 'anything called';
      return {
        ...base,
        headline: `The robot does not know ${noun} ${symbol} on line ${at}.`,
        fix: suggestion
          ? `Did you mean ${suggestion}? Java notices capital letters, so setPower and setpower are different names.`
          : isMethod
            ? 'Check the spelling, and check that this is something that kind of part can actually do. docs/FTC_MOCK_COVERAGE.md lists everything each part knows.'
            : `Make sure ${symbol} is created above this line, and that it is spelled the same in both places.`,
      };
    }

    case 'incompatible.types': {
      const found = friendlyType(d.found ?? '');
      const expected = friendlyType(d.expected ?? '');
      return {
        ...base,
        headline: `Line ${at} expects ${expected} but was given ${found}.`,
        fix: fixForTypes(d.found ?? '', d.expected ?? ''),
      };
    }

    case 'arg.length.mismatch': {
      const name = d.symbol ?? 'that method';
      const found = /found:\s+(\d+)/.exec(d.detail?.join('\n') ?? '')?.[1];
      const required = /required:\s+(.*)/.exec(d.detail?.join('\n') ?? '')?.[1];
      return {
        ...base,
        headline: `${name} on line ${at} was given ${found ?? 'the wrong number of'} things to work with.`,
        fix:
          required && required !== 'no arguments'
            ? `${name} needs exactly these, in this order: ${required}.`
            : `${name} does not take anything in its brackets.`,
      };
    }

    case 'missing.ret.stmt':
      return {
        ...base,
        headline: 'A method promises to give an answer back but never does.',
        fix: 'Any method that is not void has to finish with a return. Check that every path through it ends in one, including inside if and else.',
      };

    case 'already.defined':
      return {
        ...base,
        headline: `${d.symbol ?? 'That name'} is already taken on line ${at}.`,
        fix: 'Two things in the same place cannot share a name. Pick a different one, or remove the second type word if you meant to change the first.',
      };

    case 'unsupported.feature':
      // These messages are already written for a kid, in the parser.
      return { ...base, headline: d.message, fix: null };

    case 'no.main.method':
      return {
        ...base,
        headline: 'Nebula cannot find an OpMode to run.',
        fix: 'A program the robot can run has a class that extends OpMode or LinearOpMode. Check that the class line still says extends.',
      };

    default:
      return { ...base, headline: d.message, fix: null };
  }
}

export function translateThrow(t: JavaThrow, source: string): FriendlyError {
  const raw = [
    `Exception in thread "main" ${t.exceptionClass}${t.message ? ': ' + t.message : ''}`,
    ...t.stack,
  ].join('\n');
  const base = { kind: 'runtime' as const, line: t.line, column: null, raw };
  const at = t.line;

  switch (t.exceptionClass) {
    case 'NullPointerException': {
      const name = /'(.+?)'/.exec(t.message ?? '')?.[1];
      return {
        ...base,
        headline: name
          ? `The robot tried to use ${name} on line ${at}, but ${name} was never connected to a real part.`
          : `The robot tried to use a part on line ${at} that was never connected.`,
        fix: name
          ? `Add a line like ${name} = hardwareMap.get(DcMotor.class, "${name}"); before you use it, inside init() or before waitForStart().`
          : 'Each part needs a hardwareMap.get line before the robot can use it.',
      };
    }

    case 'ArithmeticException':
      return {
        ...base,
        headline: `Line ${at} asked the robot to divide by zero.`,
        fix: 'Check the number you are dividing by. If it comes from a variable, add an if to make sure it is not 0 first.',
      };

    case 'ArrayIndexOutOfBoundsException': {
      const m = /Index (-?\d+) out of bounds for length (\d+)/.exec(t.message ?? '');
      return {
        ...base,
        headline: m
          ? `Line ${at} asked for slot ${m[1]} of a list that only has ${m[2]}.`
          : `Line ${at} asked for a slot that is not in the list.`,
        fix: m
          ? `Slots are counted from 0, so a list of ${m[2]} has slots 0 to ${Number(m[2]) - 1}.`
          : 'Slots are counted from 0, so the last one is one less than the length.',
      };
    }

    case 'StringIndexOutOfBoundsException':
      return {
        ...base,
        headline: `Line ${at} asked for a letter that is past the end of the text.`,
        fix: 'Letters are counted from 0, so the last letter of a 5-letter word is number 4.',
      };

    case 'IllegalArgumentException':
      return {
        ...base,
        headline: t.message ?? `Line ${at} was given something it cannot use.`,
        fix: 'Device names have to match the robot configuration exactly, including capital letters.',
      };

    case 'NumberFormatException':
      return {
        ...base,
        headline: `The text on line ${at} is not a number, so the robot could not read it as one.`,
        fix: 'Integer.parseInt only works on text that is all digits, like "42". A space or a letter stops it.',
      };

    case 'StackOverflowError':
      return {
        ...base,
        headline: 'A method kept calling itself and never stopped.',
        fix: `Look at line ${at}. If a method calls itself, it needs an if that stops it at some point.`,
      };

    case 'ClassCastException':
      return {
        ...base,
        headline: t.message ?? `Line ${at} mixed up two different kinds of thing.`,
        fix: 'Check that the value is the kind this line expects. A condition in an if has to be true or false, not a number.',
      };

    case 'NoSuchFieldError':
    case 'NoSuchMethodError':
      return {
        ...base,
        headline: t.message ?? `The robot could not find something on line ${at}.`,
        fix: suggest(lastWord(t.message ?? ''), source)
          ? `Did you mean ${suggest(lastWord(t.message ?? ''), source)}?`
          : 'Check the spelling, including capital letters.',
      };

    case 'InstantiationException':
      return {
        ...base,
        headline: t.message ?? `Line ${at} tried to build a part with new.`,
        fix: 'Parts of the robot come from hardwareMap.get, not from new. The robot already has them.',
      };

    default:
      return {
        ...base,
        headline: `The robot got confused on line ${at}: ${t.exceptionClass}.`,
        fix: t.message ?? null,
      };
  }
}

/** Builder mode asks for SDK imports, as Android Studio will. The raw text is what javac
 *  prints for the same mistake. */
export function translateMissingImport(missing: MissingImport, source: string): FriendlyError {
  const className = /\bclass\s+(\w+)/.exec(source)?.[1] ?? 'YourOpMode';
  return {
    kind: 'compile',
    headline: `The robot does not know a kind of thing called ${missing.name} on line ${missing.line}.`,
    fix: `Add this line near the top, with the other import lines: import ${missing.fqn}; Android Studio needs it, so Builder asks for it too.`,
    line: missing.line,
    column: null,
    raw: `${className}.java:${missing.line}: error: cannot find symbol\n  symbol:   class ${missing.name}\n  location: class ${className}`,
  };
}

export function translateLimit(reason: RunStopReason, simMs: number, line: number): FriendlyError {
  const base = { kind: 'limit' as const, line, column: null, raw: `execution stopped: ${reason}` };
  switch (reason) {
    case 'steps':
    case 'time':
      return {
        ...base,
        headline: `The loop around line ${line} never finishes, so the robot is still waiting.`,
        fix: 'Check that something inside the loop changes the value the loop is testing. A loop counting down needs its counter to get smaller every time.',
      };
    case 'simTime':
      return {
        ...base,
        headline: `The robot ran for ${Math.round(simMs / 1000)} seconds and the loop around line ${line} is still going.`,
        fix: 'Give the loop a condition that becomes false: a timer, an encoder target, or a sensor reading. Your code is safe and nothing was lost.',
      };
    case 'stopped':
      return { ...base, headline: 'You stopped the robot.', fix: null };
    default:
      return { ...base, headline: 'The robot stopped.', fix: null };
  }
}

/* ------------------------------------------------------------- utilities */

function friendlyType(t: string): string {
  switch (t) {
    case 'int': return 'a whole number (int)';
    case 'long': return 'a whole number (long)';
    case 'double': return 'a number with a decimal point (double)';
    case 'float': return 'a number with a decimal point (float)';
    case 'boolean': return 'true or false (boolean)';
    case 'char': return 'a single letter (char)';
    case 'String': return 'text (String)';
    case '<null>': return 'nothing (null)';
    default: return t.endsWith('[]') ? `a list of ${friendlyType(t.slice(0, -2))}` : `a ${t}`;
  }
}

function fixForTypes(found: string, expected: string): string {
  if (found === 'String' && (expected === 'int' || expected === 'double')) {
    return 'Take the quote marks off, or use Integer.parseInt(...) if the text really is a number.';
  }
  if ((found === 'double' || found === 'float') && expected === 'int') {
    return `Numbers with a decimal point do not fit in an int. Either change int to double, or write (int) in front to cut the decimal part off.`;
  }
  if (found === 'int' && expected === 'boolean') {
    return 'A boolean holds only true or false. If you meant a comparison, write something like count > 0.';
  }
  if (found === 'boolean' && (expected === 'int' || expected === 'double')) {
    return 'true and false are not numbers. If you wanted 1 and 0, use an if to pick one.';
  }
  if (expected === 'String') {
    return 'Wrap it in quote marks to make it text, or use String.valueOf(...) to turn a number into text.';
  }
  return `Change the type on the left to match, or change the value on the right.`;
}

/** Closest identifier in the kid's own source, for "did you mean". */
function suggest(symbol: string, source: string): string | null {
  if (!symbol || symbol.length < 3) return null;
  const names = new Set(source.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) ?? []);
  names.delete(symbol);
  let best: string | null = null;
  let bestScore = Infinity;
  for (const n of names) {
    if (Math.abs(n.length - symbol.length) > 3) continue;
    const d = editDistance(symbol.toLowerCase(), n.toLowerCase());
    // Only suggest something genuinely close, or a pure capitalisation difference.
    const limit = symbol.length <= 5 ? 1 : 2;
    if (d <= limit && d < bestScore) {
      bestScore = d;
      best = n;
    }
  }
  return best;
}

function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const cur = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j]! + 1,
        cur[j - 1]! + 1,
        prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j]!;
  }
  return prev[b.length]!;
}

const lastWord = (s: string) => s.match(/[A-Za-z_$][A-Za-z0-9_$]*$/)?.[0] ?? '';
