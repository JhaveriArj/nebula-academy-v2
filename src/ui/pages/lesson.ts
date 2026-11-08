import { el, mount, prefersReducedMotion } from '../dom';
import { icon } from '../icons';
import { frameIndex } from '../frames';
import { renderMarkdown } from '../markdown';
import { loadLesson, nextLessonId, tierOf } from '../../content/loader';
import { SECTION_ORDER, type Lesson, type SectionName } from '../../content/types';
import { createEditor, lockedRegionFrom, type CodeEditor } from '../components/editor';
import { createFieldView } from '../components/field';
import { createConsolePanel } from '../components/consolePanel';
import { createTelemetryPanel } from '../components/telemetryPanel';
import { createGamepadPanel } from '../components/gamepadPanel';
import { playWatch } from '../../sim/watch';
import { check as runChecks, run as runProgram, type RunHandle } from '../../runtime/client';
import { entryKindOf, startTeleOp, type TeleOpSession } from '../../runtime/java/interpreter';
import { buildSim } from '../../runtime/testRunner';
import { translateDiagnostic, translateLimit, translateThrow } from '../../runtime/errorTranslator';
import { getDraft, getMode, isPassed, markPassed, setDraft } from '../../progress/store';
import { lessonHref } from '../router';
import type { SimSnapshot } from '../../sim/simulation';
import type { CheckOutcome } from '../../runtime/messages';

/* The lesson page. Two layouts from docs/DESIGN.md behind one shell: a reading state
   where prose gets the room, and a console state where the editor does. 768 px of height
   is the real constraint, so the step rail narrows rather than the console shrinking. */

const STEP_LABELS: Record<SectionName, string> = {
  mission: 'Mission',
  watch: 'Watch',
  learn: 'Learn',
  try: 'Try',
  check: 'Check',
  boost: 'Boost',
};

const CONSOLE_STEPS = new Set<SectionName>(['try', 'check']);

export interface LessonPageDeps {
  onPassed: (lessonId: string) => void;
}

export function lessonPage(lessonId: string, deps: LessonPageDeps): HTMLElement {
  const page = el('section', { class: 'lesson' }, el('p', { class: 'muted loading', text: 'Opening the lesson.' }));

  loadLesson(lessonId)
    .then((lesson) => mount(page, buildLesson(lesson, deps)))
    .catch((error: unknown) => {
      mount(page,
        el('div', { class: 'prose-page' },
          el('h1', { text: 'That lesson could not be opened' }),
          el('p', { text: error instanceof Error ? error.message : String(error) }),
          el('p', {}, el('a', { href: '#/chart', text: 'Back to the chart' })),
        ),
      );
    });

  return page;
}

function buildLesson(lesson: Lesson, deps: LessonPageDeps): HTMLElement {
  const tier = tierOf(lesson.frontmatter.id);
  const lessonNumber =
    (tier?.lessons.findIndex((l) => l.id === lesson.frontmatter.id) ?? 0) + 1;
  const spec = lesson.tests;
  const isTeleOp = entryKindOf(lesson.solution) === 'teleop';

  let step: SectionName = 'mission';
  let hintsShown = 0;
  let solutionShown = false;

  /* ------------------------------------------------------------- the pieces */

  const field = createFieldView({ label: `The field for ${lesson.frontmatter.title}` });
  const telemetry = createTelemetryPanel();
  const gamepad = createGamepadPanel();
  const console_ = createConsolePanel({ onGoToLine: (line) => editor.markError(line) });

  const startingCode = getDraft(lesson.frontmatter.id) ?? lesson.starter;
  const editor: CodeEditor = createEditor({
    code: startingCode,
    locked: lockedFor(lesson),
    onChange: (code) => queueDraftSave(lesson.frontmatter.id, code),
    onRun: () => void onRun(),
  });

  const fieldBox = el('div', { class: 'field-box' }, field.canvas);
  const caption = el('p', { class: 'field-caption muted', role: 'status', 'aria-live': 'polite' });

  const prose = el('div', { class: 'lesson-prose' });
  const actions = el('div', { class: 'lesson-actions' });
  const checkList = el('div', { class: 'check-results' });
  const hintBox = el('div', { class: 'hint-box', hidden: true });

  const runButton = el('button', { type: 'button', class: 'btn btn-run', onclick: () => void onRun() },
    icon('run', 20), el('span', { text: 'Run' }));
  const stopButton = el('button', { type: 'button', class: 'btn', disabled: true, onclick: () => stopEverything('You stopped the robot.') },
    icon('stop', 20), el('span', { text: 'Stop' }));
  const resetButton = el('button', {
    type: 'button',
    class: 'btn btn-quiet',
    onclick: () => {
      if (!confirm('Put the starting code back? Anything you have written here will go.')) return;
      editor.setCode(lesson.starter);
      setDraft(lesson.frontmatter.id, lesson.starter);
      console_.clear();
      editor.markError(null);
    },
  }, icon('reset', 20), el('span', { text: 'Reset' }));

  const checkButton = el('button', { type: 'button', class: 'btn btn-check', onclick: () => void onCheck() },
    icon('passed', 20), el('span', { text: 'Check it' }));

  const runBar = el('div', { class: 'run-bar' },
    runButton, stopButton, resetButton,
    el('span', { class: 'run-spacer' }),
    checkButton,
  );

  /* ------------------------------------------------------------- the shell */

  const railButtons = new Map<SectionName, HTMLButtonElement>();
  const rail = el('nav', { class: 'step-rail', 'aria-label': 'Parts of this lesson' },
    ...SECTION_ORDER.map((name) => {
      const button = el('button', {
        type: 'button',
        class: 'step-button',
        'aria-current': 'false',
        onclick: () => goTo(name),
      },
        el('span', { class: 'step-mark', 'aria-hidden': 'true' }),
        el('span', { class: 'step-name', text: STEP_LABELS[name] }),
      );
      railButtons.set(name, button);
      return button;
    }),
  );

  const stuckButton = el('button', {
    type: 'button',
    class: 'btn btn-quiet',
    onclick: () => revealHint(),
  }, icon('hint', 20), el('span', { text: 'Stuck?' }));

  const bar = el('div', { class: 'lesson-bar' },
    el('a', { href: '#/chart', class: 'back-link' }, icon('back', 20), el('span', { text: 'Chart' })),
    el('div', { class: 'lesson-title' },
      el('span', { class: 'lesson-tag display', text: `T${lesson.frontmatter.tier}·${String(lessonNumber).padStart(2, '0')}` }),
      el('h1', { text: lesson.frontmatter.title }),
      el('span', { class: 'lesson-minutes muted', text: `${lesson.frontmatter.minutes} min` }),
    ),
    stuckButton,
  );

  /* Check results, hints and the next-lesson button have to be visible in BOTH layouts.
     The reading column is hidden in the console state, so this slot is re-parented into
     whichever column is on screen rather than being duplicated. */
  const resultsSlot = el('div', { class: 'results-slot' }, hintBox, checkList, actions);

  const readingColumn = el('div', { class: 'lesson-reading' }, prose, resultsSlot);
  const consoleColumn = el('div', { class: 'lesson-console' },
    el('p', { class: 'lesson-reminder' }),
    editor.element,
    runBar,
    console_.element,
  );
  const sideColumn = el('aside', { class: 'lesson-side' },
    fieldBox,
    caption,
    telemetry.element,
    isTeleOp ? gamepad.element : null,
  );

  const shell = el('div', { class: 'lesson-shell', 'data-state': 'reading' },
    rail,
    readingColumn,
    consoleColumn,
    sideColumn,
  );

  const root = el('section', { class: 'lesson' }, bar, shell);

  /* --------------------------------------------------------------- running */

  let liveSession: TeleOpSession | null = null;
  let liveFrame = 0;
  let workerHandle: RunHandle<unknown> | null = null;
  let watchTimer = 0;

  const setBusy = (busy: boolean) => {
    runButton.disabled = busy;
    stopButton.disabled = !busy;
    resetButton.disabled = busy;
    checkButton.disabled = busy;
    runButton.classList.toggle('is-live', busy);
  };

  function stopEverything(message?: string): void {
    if (watchTimer) {
      cancelAnimationFrame(watchTimer);
      watchTimer = 0;
    }
    if (liveFrame) {
      cancelAnimationFrame(liveFrame);
      liveFrame = 0;
    }
    if (liveSession) {
      const result = liveSession.finish();
      liveSession = null;
      gamepad.stop();
      gamepad.reset();
      if (result.thrown) console_.showError(translateThrow(result.thrown, editor.getCode()));
    }
    if (workerHandle) {
      workerHandle.stop();
      workerHandle = null;
    }
    setBusy(false);
    if (message) console_.setStatus(message);
  }

  async function onRun(): Promise<void> {
    stopEverything();
    console_.clear();
    editor.markError(null);
    const code = editor.getCode();
    setBusy(true);
    console_.setStatus('Running.');

    if (entryKindOf(code) === 'teleop') {
      runLiveTeleOp(code);
      return;
    }

    const handle = runProgram(code, spec, (snapshot) => {
      field.draw(snapshot);
      telemetry.update(snapshot);
    });
    workerHandle = handle;
    try {
      const outcome = await handle.done;
      workerHandle = null;
      field.draw(outcome.snapshot);
      telemetry.update(outcome.snapshot);
      console_.setOutput(outcome.snapshot.output);
      console_.showError(outcome.error);
      if (outcome.error?.line) editor.markError(outcome.error.line);
      console_.setStatus(
        outcome.error ? null : `Finished after ${(outcome.snapshot.timeMs / 1000).toFixed(1)} seconds of robot time.`,
      );
    } catch (error) {
      workerHandle = null;
      console_.setStatus(error instanceof Error ? error.message : 'The runner stopped.');
    } finally {
      setBusy(false);
    }
  }

  function runLiveTeleOp(code: string): void {
    const sim = buildSim(spec);
    const started = startTeleOp(code, {
      sim,
      teleOpForMs: Number.MAX_SAFE_INTEGER,
      maxSimMs: Number.MAX_SAFE_INTEGER,
      maxSteps: 400_000,
    });

    if (started === null) {
      console_.setStatus('That program is not a TeleOp.');
      setBusy(false);
      return;
    }
    if (!('step' in started)) {
      const first = started.diagnostics.find((d) => d.severity === 'error');
      if (first) {
        console_.showError(translateDiagnostic(first, code));
        editor.markError(first.line);
      }
      setBusy(false);
      return;
    }

    liveSession = started;
    gamepad.start();
    console_.setStatus('Driving. Use the controller below, or a real one.');

    /* About three steps a frame gets close to the 50 Hz a real robot runs at, while
       leaving the page responsive between frames. */
    const STEPS_PER_FRAME = 3;
    const tick = () => {
      if (!liveSession) return;
      gamepad.apply(sim.gamepad1);
      let alive = true;
      for (let i = 0; i < STEPS_PER_FRAME && alive; i++) alive = liveSession.step();
      const snapshot = sim.snapshot();
      field.draw(snapshot);
      telemetry.update(snapshot);
      console_.setOutput(snapshot.output);

      if (!alive) {
        const result = liveSession.finish();
        liveSession = null;
        gamepad.stop();
        setBusy(false);
        liveFrame = 0;
        if (result.thrown) {
          console_.showError(translateThrow(result.thrown, code));
          editor.markError(result.thrown.line);
        } else if (result.stopReason === 'steps' || result.stopReason === 'time') {
          console_.showError(translateLimit(result.stopReason, sim.timeMs, result.stopLine));
          editor.markError(result.stopLine);
        } else {
          console_.setStatus('The TeleOp finished.');
        }
        return;
      }
      liveFrame = requestAnimationFrame(tick);
    };
    liveFrame = requestAnimationFrame(tick);
  }

  async function onCheck(): Promise<void> {
    stopEverything();
    console_.clear();
    editor.markError(null);
    goTo('check');
    const code = editor.getCode();
    setBusy(true);
    mount(checkList, el('p', { class: 'muted', text: 'Running the checks.' }));

    const handle = runChecks(code, spec);
    workerHandle = handle;
    try {
      const outcome = await handle.done;
      workerHandle = null;
      field.draw(outcome.snapshot);
      telemetry.update(outcome.snapshot);
      console_.setOutput(outcome.snapshot.output);
      showCheckOutcome(outcome, code);
    } catch (error) {
      workerHandle = null;
      mount(checkList, el('p', { class: 'fail', text: error instanceof Error ? error.message : 'The checks stopped.' }));
    } finally {
      setBusy(false);
    }
  }

  function showCheckOutcome(outcome: CheckOutcome, code: string): void {
    if (outcome.error) {
      console_.showError(outcome.error);
      if (outcome.error.line) editor.markError(outcome.error.line);
      mount(checkList,
        el('p', { class: 'fail check-blocked', text: 'The checks could not run, because the robot got confused first. The console says where.' }),
      );
      return;
    }

    mount(checkList,
      el('ul', { class: 'check-items' },
        ...outcome.results.map((result) =>
          el('li', { class: result.passed ? 'check-item pass' : 'check-item fail' },
            icon(result.passed ? 'passed' : 'failed', 20),
            el('span', { class: 'check-label', text: result.label }),
            el('span', { class: 'check-detail muted', text: result.detail }),
          ),
        ),
      ),
    );

    if (!outcome.passed) {
      const failed = outcome.results.filter((r) => !r.passed).length;
      checkList.prepend(
        el('p', { class: 'check-summary', text: `${failed} of ${outcome.results.length} checks are not happy yet. Nothing is broken; have another go.` }),
      );
      return;
    }

    checkList.prepend(el('p', { class: 'check-summary pass display', text: 'All checks passed.' }));
    void code;
    celebrate();
  }

  /* ----------------------------------------------------------- celebration */

  function celebrate(): void {
    const newlyPassed = markPassed(lesson.frontmatter.id);
    const next = nextLessonId(lesson.frontmatter.id);
    const banner = el('div', { class: 'celebrate', role: 'status' },
      el('p', { class: 'celebrate-line display', text: newlyPassed ? 'Waypoint logged.' : 'Passed again.' }),
    );
    mount(actions, banner);

    // CLAUDE.md: one second, then the next-lesson button. No paragraph of praise.
    const show = () => {
      mount(actions,
        next
          ? el('a', { href: lessonHref(next), class: 'btn btn-next' }, el('span', { text: 'Next lesson' }), icon('next', 20))
          : el('a', { href: '#/chart', class: 'btn btn-next' }, el('span', { text: 'Back to the chart' }), icon('chart', 20)),
        el('a', { href: '#/chart', class: 'btn btn-quiet' }, el('span', { text: 'Chart' })),
      );
    };
    if (prefersReducedMotion()) show();
    else setTimeout(show, 1000);

    if (newlyPassed) deps.onPassed(lesson.frontmatter.id);
  }

  /* ----------------------------------------------------------------- hints */

  function revealHint(): void {
    hintBox.hidden = false;
    const total = lesson.hints.hints.length;
    if (hintsShown < total) hintsShown++;
    else solutionShown = true;

    mount(hintBox,
      el('p', { class: 'hint-title display', text: 'Stuck?' }),
      ...lesson.hints.hints.slice(0, hintsShown).map((hint, i) =>
        el('p', { class: 'hint' }, el('span', { class: 'hint-number display', text: `${i + 1}.` }), el('span', { text: hint })),
      ),
      solutionShown
        ? el('div', { class: 'hint-solution' },
            el('p', { class: 'hint-title display', text: 'The finished code' }),
            el('pre', { class: 'code-block' }, el('code', { text: lesson.solution })),
            el('button', {
              type: 'button',
              class: 'btn btn-quiet',
              onclick: () => {
                editor.setCode(lesson.solution);
                setDraft(lesson.frontmatter.id, lesson.solution);
                goTo('try');
              },
            }, el('span', { text: 'Put it in the editor' })),
          )
        : el('p', { class: 'muted hint-more' },
            hintsShown < total
              ? `Press Stuck again for hint ${hintsShown + 1} of ${total}.`
              : 'Press Stuck again to see the finished code.',
          ),
    );
    hintBox.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  /* ----------------------------------------------------------------- steps */

  function goTo(name: SectionName): void {
    if (step === 'watch' && name !== 'watch' && watchTimer) {
      cancelAnimationFrame(watchTimer);
      watchTimer = 0;
    }
    step = name;
    const consoleState = CONSOLE_STEPS.has(name);
    shell.setAttribute('data-state', consoleState ? 'console' : 'reading');
    // Move the results, hints and next-lesson button to the column that is showing.
    if (consoleState) consoleColumn.insertBefore(resultsSlot, console_.element);
    else readingColumn.appendChild(resultsSlot);
    for (const [key, button] of railButtons) {
      const done = SECTION_ORDER.indexOf(key) < SECTION_ORDER.indexOf(name);
      button.setAttribute('aria-current', key === name ? 'step' : 'false');
      button.classList.toggle('is-done', done);
      button.classList.toggle('is-current', key === name);
    }
    renderStep();
  }

  function renderStep(): void {
    const mode = getMode();
    mount(checkList);
    const reminder = consoleColumn.querySelector('.lesson-reminder');
    if (reminder) reminder.textContent = lesson.sections.mission;

    if (step === 'watch') {
      mount(prose,
        el('h2', { text: 'Watch' }),
        renderMarkdown(lesson.sections.watch, { headingOffset: 2 }),
      );
      mount(actions,
        el('button', { type: 'button', class: 'btn', onclick: () => playTheDemo() }, icon('run', 20), el('span', { text: 'Play it again' })),
        el('button', { type: 'button', class: 'btn btn-next', onclick: () => goTo('learn') }, el('span', { text: 'Learn why' }), icon('next', 20)),
      );
      playTheDemo();
      return;
    }

    if (step === 'learn') {
      mount(prose,
        el('h2', { text: 'Learn' }),
        renderMarkdown(lesson.sections.learn, { headingOffset: 2 }),
        mode === 'builder' && lesson.sections.why
          ? el('aside', { class: 'why-panel' },
              el('h3', { class: 'why-title', text: 'Why this works' }),
              renderMarkdown(lesson.sections.why, { headingOffset: 3 }),
            )
          : null,
      );
      mount(actions,
        el('button', { type: 'button', class: 'btn btn-next', onclick: () => goTo('try') }, el('span', { text: 'Try it' }), icon('next', 20)),
      );
      return;
    }

    if (step === 'try') {
      mount(prose, el('h2', { text: 'Try' }), renderMarkdown(lesson.sections.try, { headingOffset: 2 }));
      mount(actions);
      return;
    }

    if (step === 'check') {
      mount(prose, el('h2', { text: 'Check' }), renderMarkdown(lesson.sections.check, { headingOffset: 2 }));
      if (isPassed(lesson.frontmatter.id)) {
        const next = nextLessonId(lesson.frontmatter.id);
        mount(actions,
          el('p', { class: 'pass', text: 'You have already passed this one.' }),
          next ? el('a', { href: lessonHref(next), class: 'btn btn-next' }, el('span', { text: 'Next lesson' }), icon('next', 20)) : null,
        );
      } else {
        mount(actions);
      }
      return;
    }

    if (step === 'boost') {
      mount(prose, el('h2', { text: 'Boost' }), renderMarkdown(lesson.sections.boost, { headingOffset: 2 }));
      const next = nextLessonId(lesson.frontmatter.id);
      mount(actions,
        next ? el('a', { href: lessonHref(next), class: 'btn btn-next' }, el('span', { text: 'Next lesson' }), icon('next', 20)) : null,
        el('a', { href: '#/chart', class: 'btn btn-quiet' }, el('span', { text: 'Chart' })),
      );
      return;
    }

    // Mission.
    mount(prose,
      el('p', { class: 'mission display', text: lesson.sections.mission }),
      el('p', { class: 'muted', text: `Tier ${lesson.frontmatter.tier}, ${tier?.name ?? ''}. About ${lesson.frontmatter.minutes} minutes.` }),
      el('p', { text: lesson.frontmatter.concept }),
    );
    mount(actions,
      el('button', { type: 'button', class: 'btn btn-next', onclick: () => goTo('watch') }, el('span', { text: 'Watch the robot' }), icon('next', 20)),
    );
  }

  /* ------------------------------------------------------------- the demo */

  function playTheDemo(): void {
    if (watchTimer) cancelAnimationFrame(watchTimer);
    const frames = playWatch(lesson.watch);
    if (!frames.length) return;

    if (prefersReducedMotion()) {
      const last = frames[frames.length - 1]!;
      field.draw(last.snapshot);
      telemetry.update(last.snapshot);
      caption.textContent = 'Demo shown as its finished position, because you asked for less motion.';
      return;
    }

    const startedAt = performance.now();
    const show = (now: number) => {
      const index = frameIndex(now, startedAt, frames.length, false);
      const frame = frames[index]!;
      field.draw(frame.snapshot);
      telemetry.update(frame.snapshot);
      caption.textContent = frame.caption ?? '';
      if (index < frames.length - 1) watchTimer = requestAnimationFrame(show);
      else watchTimer = 0;
    };
    watchTimer = requestAnimationFrame(show);
  }

  /* ------------------------------------------------------------- lifecycle */

  const initial: SimSnapshot = buildSim(spec).snapshot();
  field.draw(initial);
  telemetry.update(null);
  goTo('mission');
  requestAnimationFrame(() => field.resize());

  // Explorer locks more of the code, so a mode change has to reach the editor.
  root.addEventListener('nebula:modechange', () => {
    editor.setLocked(lockedFor(lesson));
    renderStep();
  });
  root.addEventListener('nebula:leave', () => {
    stopEverything();
    editor.destroy();
    field.destroy();
  });

  return root;
}

/* ------------------------------------------------------------- utilities */

function lockedFor(lesson: Lesson) {
  if (getMode() !== 'explorer') return null;
  const lines = lesson.starter.split('\n').length;
  return lockedRegionFrom(lesson.frontmatter.explorerLockedRanges, lines);
}

/** Saves the draft a beat after typing stops, rather than on every keystroke. */
let draftTimer = 0;
function queueDraftSave(lessonId: string, code: string): void {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => setDraft(lessonId, code), 400) as unknown as number;
}
