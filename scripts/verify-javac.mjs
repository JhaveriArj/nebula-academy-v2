#!/usr/bin/env node
/* The real-javac gate from docs/ARCHITECTURE.md.
   Compiles every starter.java and solution.java against generated real .java stubs
   of the mocked FTC SDK, proving a kid's code would compile in Android Studio.
   Skips itself with a notice when no JDK is installed, because the authoring
   machine has none and this must never block `npm run check`. */
import { execFileSync, execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = new URL('..', import.meta.url).pathname;

const hasJavac = () => {
  try {
    execSync('javac -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

if (!hasJavac()) {
  console.log('verify:javac  skipped — no JDK on this machine.');
  console.log('              CI runs this gate with Temurin 17 (.github/workflows/ci.yml).');
  process.exit(0);
}

const tiers = join(ROOT, 'content/tiers');
if (!existsSync(tiers)) {
  console.log('verify:javac  no lessons yet, nothing to compile.');
  process.exit(0);
}

const lessonFiles = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name === 'starter.java' || name === 'solution.java') lessonFiles.push(p);
  }
};
walk(tiers);

const stubs = [];
const stubDir = join(ROOT, 'ftc-stubs');
if (existsSync(stubDir)) {
  const walkStubs = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walkStubs(p);
      else if (name.endsWith('.java')) stubs.push(p);
    }
  };
  walkStubs(stubDir);
}

if (!lessonFiles.length) {
  console.log('verify:javac  no lesson sources yet, nothing to compile.');
  process.exit(0);
}
if (!stubs.length) {
  console.error('verify:javac  ftc-stubs/ is empty. Run `npm run gen:stubs` first.');
  process.exit(1);
}

let failed = 0;
for (const file of lessonFiles) {
  const out = mkdtempSync(join(tmpdir(), 'nebula-javac-'));
  try {
    execFileSync('javac', ['-nowarn', '-d', out, ...stubs, file], { stdio: 'pipe' });
    console.log(`ok    ${file.slice(ROOT.length)}`);
  } catch (err) {
    failed++;
    console.error(`FAIL  ${file.slice(ROOT.length)}`);
    console.error(String(err.stderr ?? err.stdout ?? err.message).trimEnd());
  }
}

if (failed) {
  console.error(`\nverify:javac  ${failed} file(s) are not valid Java.`);
  process.exit(1);
}
console.log(`\nverify:javac  ${lessonFiles.length} file(s) compile with real javac.`);
