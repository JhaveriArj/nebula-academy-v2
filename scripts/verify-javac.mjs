#!/usr/bin/env node
/* The real-javac gate from docs/ARCHITECTURE.md.

   Compiles every starter.java and solution.java against generated real .java stubs of the
   mocked FTC SDK, proving a kid's code would compile in Android Studio. This is the
   guarantee behind "the code you write here pastes in unchanged".

   Java requires a public class to live in a file named after it, and lesson files are
   named starter.java and solution.java, so each one is copied to <ClassName>.java in a
   temp directory first. That is also a check in itself: a lesson whose public class name
   could not be found would not compile in a real project either. */
import { execFileSync, execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = new URL('..', import.meta.url).pathname;

/* Homebrew's openjdk is keg-only, so javac is there without being on PATH. Looking for it
   means `npm run verify:javac` works right after `brew install openjdk@17`. */
const CANDIDATE_JDKS = [
  '/opt/homebrew/opt/openjdk@17/bin',
  '/opt/homebrew/opt/openjdk@21/bin',
  '/opt/homebrew/opt/openjdk/bin',
  '/usr/local/opt/openjdk@17/bin',
  '/usr/local/opt/openjdk/bin',
];

function findJavac() {
  try {
    execSync('javac -version', { stdio: 'ignore' });
    return 'javac';
  } catch {
    // Not on PATH; try the usual keg-only locations.
  }
  for (const dir of CANDIDATE_JDKS) {
    const candidate = join(dir, 'javac');
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

const javac = findJavac();
if (!javac) {
  console.log('verify:javac  skipped — no JDK on this machine.');
  console.log('              Install one with:  brew install openjdk@17');
  console.log('              CI runs this gate with Temurin 17 (.github/workflows/ci.yml).');
  process.exit(0);
}

const tiers = join(ROOT, 'content/tiers');
if (!existsSync(tiers)) {
  console.log('verify:javac  no lessons yet, nothing to compile.');
  process.exit(0);
}

const walk = (dir, match, out = []) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, match, out);
    else if (match(name)) out.push(p);
  }
  return out;
};

const lessonFiles = walk(tiers, (n) => n === 'starter.java' || n === 'solution.java');
const stubDir = join(ROOT, 'ftc-stubs');
const stubs = existsSync(stubDir) ? walk(stubDir, (n) => n.endsWith('.java')) : [];

if (!lessonFiles.length) {
  console.log('verify:javac  no lesson sources yet, nothing to compile.');
  process.exit(0);
}
if (!stubs.length) {
  console.error('verify:javac  ftc-stubs/ is empty. Run `npm run gen:stubs` first.');
  process.exit(1);
}

/** The public top-level class, which is what the file has to be named after. */
function publicClassName(source) {
  const match = /^\s*public\s+(?:final\s+|abstract\s+)?(?:class|interface|enum)\s+(\w+)/m.exec(source);
  return match ? match[1] : null;
}

// Compile the stubs once; every lesson then compiles against the result.
const work = mkdtempSync(join(tmpdir(), 'nebula-javac-'));
const stubOut = join(work, 'stub-classes');
mkdirSync(stubOut, { recursive: true });
try {
  execFileSync(javac, ['-nowarn', '-d', stubOut, ...stubs], { stdio: 'pipe' });
} catch (err) {
  console.error('verify:javac  the generated ftc-stubs/ do not compile. Run `npm run gen:stubs`.');
  console.error(String(err.stderr ?? err.stdout ?? err.message).trimEnd());
  rmSync(work, { recursive: true, force: true });
  process.exit(1);
}

let failed = 0;
const problems = [];

for (const file of lessonFiles) {
  const relative = file.slice(ROOT.length);
  const source = readFileSync(file, 'utf8');
  const className = publicClassName(source);

  if (!className) {
    failed++;
    problems.push(`${relative}\n  no public class found, so this could not be a file in a real project`);
    continue;
  }

  const dir = mkdtempSync(join(work, 'lesson-'));
  const target = join(dir, `${className}.java`);
  copyFileSync(file, target);

  try {
    execFileSync(javac, ['-nowarn', '-classpath', stubOut, '-d', dir, target], { stdio: 'pipe' });
    console.log(`ok    ${relative}  (${className})`);
  } catch (err) {
    failed++;
    const text = String(err.stderr ?? err.stdout ?? err.message)
      .split('\n')
      .map((line) => line.replace(target, relative))
      .join('\n')
      .trimEnd();
    problems.push(`${relative}\n${text}`);
  }
}

rmSync(work, { recursive: true, force: true });

if (failed) {
  console.error(`\nverify:javac  ${failed} of ${lessonFiles.length} file(s) are not valid Java.\n`);
  for (const problem of problems) console.error(problem + '\n');
  process.exit(1);
}
console.log(`\nverify:javac  all ${lessonFiles.length} lesson files compile with real javac (${javac}).`);
