import { el, mount, prefersReducedMotion } from '../dom';
import { icon } from '../icons';
import { missingImports } from '../../runtime/java/imports';
import { translateMissingImport } from '../../runtime/errorTranslator';
import { frameIndex } from '../frames';
import { renderMarkdown } from '../markdown';
import { mountFigures } from '../../figures';
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
import { fieldThumb, inkCheck, mascot, paper, routeOf, stepIcon } from '../kit';
import { mascotHead } from '../mascot';
import { ticksDue, type SimSnapshot } from '../../sim/simulation';
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

/** The rail's steps. Watch is part of Mission now: the demo plays on the field while the
    mission is read, so it is not a step of its own. */
const RAIL_STEPS: SectionName[] = SECTION_ORDER.filter((s) => s !== 'watch');
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';

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
          el('p', { text: 'The link may be old, or the lesson may have moved. Every lesson is on the star chart.' }),
          el('p', {}, el('a', { class: 'btn btn-next', href: '#/chart', text: 'Open the star chart' })),
          // The technical reason stays reachable for a mentor, like the error console's toggle.
          el('details', { class: 'raw-error' },
            el('summary', { text: 'Show the real error' }),
            el('pre', { class: 'code-block' }, el('code', { text: error instanceof Error ? error.message : String(error) })),
          ),
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
    onLockedEdit: () => console_.setStatus('That line is locked. Change the lines marked in yellow.'),
  });

  const fieldBox = el('div', { class: 'field-box' }, field.canvas);
  const caption = el('p', { class: 'field-caption muted', role: 'status', 'aria-live': 'polite' });

  const prose = el('div', { class: 'lesson-prose' });
  const actions = el('div', { class: 'lesson-actions' });
  const checkList = el('div', { class: 'check-results' });
  const hintBox = el('div', { class: 'hint-box' });
  const closeHints = () => {
    hintDrawer.hidden = true;
    stuckButton.setAttribute('aria-expanded', 'false');
    stuckButton.focus();
  };
  // Stuck? opens a drawer from the right, over the field, so the code it is about stays in
  // view beside it.
  const hintDrawer = el('aside', { class: 'hint-drawer', id: 'lesson-hints', hidden: true, 'aria-label': 'Hints' },
    el('div', { class: 'hint-drawer-head' },
      el('p', { class: 'hint-title display', text: 'Stuck?' }),
      el('button', { type: 'button', class: 'btn btn-quiet hint-close', onclick: closeHints }, el('span', { text: 'Close' })),
    ),
    hintBox,
  );
  hintDrawer.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeHints(); });

  const runButton = el('button', { type: 'button', class: 'btn btn-run', onclick: () => void onRun() },
    icon('run', 20), el('span', { text: 'Run' }));
  const stopButton = el('button', { type: 'button', class: 'btn', disabled: true, onclick: () => stopEverything('You stopped the robot.') },
    icon('stop', 20), el('span', { text: 'Stop' }));
  // Reset acts at once and offers Undo, instead of a browser confirm() (HIG alerts.md:
  // "avoid displaying alerts for common, undoable actions"). The status line is mounted
  // empty up front so its first message is announced.
  const resetNotice = el('p', { class: 'reset-notice', role: 'status', 'aria-live': 'polite' });
  const clearResetNotice = () => mount(resetNotice);
  const resetButton = el('button', {
    type: 'button',
    class: 'btn btn-quiet',
    onclick: () => {
      const before = editor.getCode();
      if (before === lesson.starter) return;
      editor.setCode(lesson.starter);
      setDraft(lesson.frontmatter.id, lesson.starter);
      console_.clear();
      editor.markError(null);
      mount(resetNotice,
        el('span', { text: 'Back to the starting code.' }),
        el('button', {
          type: 'button',
          class: 'link-button',
          onclick: () => {
            editor.setCode(before);
            setDraft(lesson.frontmatter.id, before);
            mount(resetNotice, el('span', { text: 'Your code is back.' }));
          },
        }, el('span', { text: 'Undo' })),
      );
    },
  }, icon('reset', 20), el('span', { text: 'Reset' }));

  const checkButton = el('button', { type: 'button', class: 'btn btn-check', onclick: () => void onCheck() },
    icon('passed', 20), el('span', { text: 'Check it' }));

  const runBar = el('div', { class: 'run-bar' },
    runButton, stopButton, resetButton,
    resetNotice,
    el('span', { class: 'run-spacer' }),
    checkButton,
  );

  /* ------------------------------------------------------------- the shell */

  const railButtons = new Map<SectionName, HTMLButtonElement>();
  const railFill = el('span', { class: 'step-track-fill' });
  const rail = el('nav', { class: 'step-rail', 'aria-label': 'Parts of this lesson' },
    el('span', { class: 'step-track', 'aria-hidden': 'true' }, railFill),
    ...RAIL_STEPS.map((name) => {
      const button = el('button', {
        type: 'button',
        class: 'step-button',
        'aria-current': 'false',
        onclick: () => goTo(name),
      },
        el('span', { class: 'step-mark', 'aria-hidden': 'true' }, stepIcon(name, 18), inkCheck(18)),
        el('span', { class: 'step-name', text: STEP_LABELS[name] }),
      );
      railButtons.set(name, button);
      return button;
    }),
  );

  const stuckButton = el('button', {
    type: 'button',
    class: 'btn btn-quiet',
    'aria-expanded': 'false',
    'aria-controls': 'lesson-hints',
    onclick: () => revealHint(),
  }, icon('hint', 20), el('span', { text: 'Stuck?' }));

  const lessonMascot = el('span', { class: 'lesson-mascot', 'aria-hidden': 'true' }, mascotHead(28));
  /** A hop when the checks pass, a puzzled tilt when they do not. Never under reduced motion. */
  const react = (mood: 'happy' | 'puzzled') => {
    if (prefersReducedMotion()) return;
    lessonMascot.classList.remove('is-happy', 'is-puzzled');
    void lessonMascot.offsetWidth;
    lessonMascot.classList.add(`is-${mood}`);
  };
  const bar = el('div', { class: 'lesson-bar' },
    el('a', { href: '#/chart', class: 'back-link' }, icon('back', 20), el('span', { text: 'Chart' })),
    el('div', { class: 'lesson-title' },
      lessonMascot,
      el('span', { class: 'lesson-tag display', text: `T${lesson.frontmatter.tier}·${String(lessonNumber).padStart(2, '0')}` }),
      el('h1', { text: lesson.frontmatter.title }),
      el('span', { class: 'lesson-minutes muted', text: `${lesson.frontmatter.minutes} min` }),
    ),
    stuckButton,
  );

  /* Check results, hints and the next-lesson button have to be visible in BOTH layouts.
     The reading column is hidden in the console state, so this slot is re-parented into
     whichever column is on screen rather than being duplicated. */
  const resultsSlot = el('div', { class: 'results-slot' }, checkList, actions);

  const readingColumn = el('div', { class: 'lesson-reading' }, prose, resultsSlot);
  const consoleColumn = el('div', { class: 'lesson-console' },
    el('p', { class: 'lesson-reminder' }),
    editor.element,
    runBar,
    console_.element,
  );
  const sideColumn = el('aside', { class: 'lesson-side' },
    hintDrawer,
    fieldBox,
    caption,
    // Driving by hand needs the field and the gamepad on screen together, so the
    // gamepad comes before telemetry; telemetry is the part that may scroll.
    isTeleOp ? gamepad.element : null,
    telemetry.element,
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
    clearResetNotice();
    stopEverything();
    console_.clear();
    editor.markError(null);
    const code = editor.getCode();
    if (stoppedByMissingImport(code)) return;
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

    /* One loop() per 20 ms of real time, the 50 Hz a real robot runs at, on a 60 Hz or a
       120 Hz screen alike; the first frame runs one loop. */
    let lastFrame = 0, carryMs = 0;
    const tick = (now: number) => {
      if (!liveSession) return;
      gamepad.apply(sim.gamepad1);
      const due = lastFrame ? ticksDue(carryMs, now - lastFrame) : { ticks: 1, carryMs: 0 };
      lastFrame = now;
      carryMs = due.carryMs;
      let alive = true;
      for (let i = 0; i < due.ticks && alive; i++) alive = liveSession.step();
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

  /** Builder asks for SDK imports, as Android Studio will; Explorer does not. */
  function stoppedByMissingImport(code: string): boolean {
    if (getMode() !== 'builder') return false;
    const missing = missingImports(code)[0];
    if (!missing) return false;
    const error = translateMissingImport(missing, code);
    console_.showError(error);
    editor.markError(missing.line);
    console_.setStatus(null);
    return true;
  }

  async function onCheck(): Promise<void> {
    stopEverything();
    console_.clear();
    editor.markError(null);
    goTo('check');
    const code = editor.getCode();
    if (stoppedByMissingImport(code)) {
      mount(checkList, el('p', { class: 'muted', text: 'Fix the line marked in the editor, then press Check it again.' }));
      return;
    }
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
      showCheckOutcome(outcome);
    } catch (error) {
      workerHandle = null;
      mount(checkList, el('p', { class: 'fail', text: error instanceof Error ? error.message : 'The checks stopped.' }));
    } finally {
      setBusy(false);
    }
  }

  function showCheckOutcome(outcome: CheckOutcome): void {
    if (outcome.error) {
      console_.showError(outcome.error);
      if (outcome.error.line) editor.markError(outcome.error.line);
      mount(checkList,
        el('p', { class: 'fail check-blocked', text: 'The checks could not run, because the robot got confused first. The console says where.' }),
      );
      return;
    }

    const rows = outcome.results.map((result) =>
      el('li', { class: result.passed ? 'check-item pass' : 'check-item fail' },
        result.passed ? inkCheck(20) : icon('failed', 20),
        el('span', { class: 'check-label', text: result.label }),
        el('span', { class: 'check-detail muted', text: result.detail }),
      ));
    mount(checkList, el('ul', { class: 'check-items' }, ...rows));
    if (!prefersReducedMotion()) {
      // The panel rises from under the editor, then each row lands 80ms after the last.
      if (CONSOLE_STEPS.has(step)) resultsSlot.animate([{ transform: 'translateY(24px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: EASE_OUT });
      rows.forEach((row, i) => row.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 280, delay: i * 80, easing: EASE_OUT, fill: 'backwards' }));
    }

    if (!outcome.passed) {
      const failed = outcome.results.filter((r) => !r.passed).length;
      react('puzzled');
      checkList.prepend(
        el('p', { class: 'check-summary', text: `${failed} of ${outcome.results.length} ${new Intl.PluralRules('en').select(failed) === 'one' ? 'check is' : 'checks are'} not happy yet. Nothing is broken; have another go.` }),
      );
      return;
    }

    checkList.prepend(paper('pinned', el('p', { class: 'check-summary pass-note display', text: 'All checks passed.' })));
    react('happy');
    // The mascot in the site header blinks its antenna tips once.
    if (!prefersReducedMotion()) {
      for (const head of document.querySelectorAll<SVGElement>('.site-header .mascot-head')) {
        head.classList.remove('is-blinking');
        void head.getBoundingClientRect();
        head.classList.add('is-blinking');
      }
    }
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
    const opening = hintDrawer.hidden;
    hintDrawer.hidden = false;
    if (opening && !prefersReducedMotion()) {
      hintDrawer.animate([{ transform: 'translateX(24px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: EASE_OUT });
    }
    stuckButton.setAttribute('aria-expanded', 'true');
    const total = lesson.hints.hints.length;
    if (hintsShown < total) hintsShown++;
    else solutionShown = true;

    mount(hintBox,
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
        // The next hint is a button right here, not "press Stuck again": by now the Stuck
        // button has usually scrolled out of sight.
        : el('button', { type: 'button', class: 'btn btn-quiet hint-more', onclick: () => revealHint() },
            icon('hint', 20),
            el('span', { text: hintsShown < total ? `Show hint ${hintsShown + 1} of ${total}` : 'Show the finished code' }),
          ),
    );
    hintBox.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    // Put focus on what just appeared, so a screen reader reads it and a keyboard user is
    // next to the button for the following hint.
    const newest = solutionShown
      ? hintBox.querySelector<HTMLElement>('.hint-solution .hint-title')
      : hintBox.querySelectorAll<HTMLElement>('.hint')[hintsShown - 1];
    if (newest) {
      newest.setAttribute('tabindex', '-1');
      newest.focus({ preventScroll: true });
    }
  }

  /* ----------------------------------------------------------------- steps */

  function goTo(requested: SectionName): void {
    const name: SectionName = requested === 'watch' ? 'mission' : requested;
    const entering = name !== step;
    if (step === 'mission' && name !== 'mission' && watchTimer) {
      cancelAnimationFrame(watchTimer);
      watchTimer = 0;
    }
    step = name;
    const consoleState = CONSOLE_STEPS.has(name);
    shell.setAttribute('data-state', consoleState ? 'console' : 'reading');
    // The run bar's primary button follows the step: Run in Try, Check it in Check.
    shell.setAttribute('data-step', name);
    // Move the results, hints and next-lesson button to the column that is showing.
    if (consoleState) consoleColumn.insertBefore(resultsSlot, console_.element);
    else readingColumn.appendChild(resultsSlot);
    placeTrack();
    railFill.style.transform = `scaleY(${RAIL_STEPS.indexOf(name) / Math.max(1, RAIL_STEPS.length - 1)})`;
    for (const [key, button] of railButtons) {
      const done = RAIL_STEPS.indexOf(key) < RAIL_STEPS.indexOf(name);
      button.setAttribute('aria-current', key === name ? 'step' : 'false');
      button.classList.toggle('is-done', done);
      button.classList.toggle('is-current', key === name);
    }
    renderStep();
    // Each step's content rises 16px into place once, as you arrive on it.
    if (entering && !prefersReducedMotion()) {
      for (const node of [prose, actions]) {
        node.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 350, easing: EASE_OUT });
      }
    }
    keepFocus();
  }

  /** The track runs from the first step's disc to the last one's, measured, so it fits the
      wide rail, the narrow one and any text size. */
  function placeTrack(): void {
    const marks = [...rail.querySelectorAll<HTMLElement>('.step-mark')];
    const first = marks[0];
    const last = marks[marks.length - 1];
    if (!first || !last) return;
    const box = rail.getBoundingClientRect();
    const a = first.getBoundingClientRect();
    const b = last.getBoundingClientRect();
    const track = railFill.parentElement as HTMLElement;
    track.style.left = `${a.left - box.left + a.width / 2 - 1 + rail.scrollLeft}px`;
    track.style.top = `${a.top - box.top + a.height / 2 + rail.scrollTop}px`;
    track.style.height = `${Math.max(0, b.top - a.top)}px`;
  }
  addEventListener('resize', placeTrack);

  /** A next-step button is removed by the re-render, which drops focus on <body> and sends a
   *  keyboard user back to the top of the page. Put it on the new step's heading instead.
   *  A rail button survives the re-render, so focus stays on it. (WCAG 2.4.3.) */
  function keepFocus(): void {
    const active = document.activeElement;
    if (active && active !== document.body && active.isConnected) return;
    const target = CONSOLE_STEPS.has(step)
      ? consoleColumn.querySelector<HTMLElement>('.lesson-reminder')
      : prose.querySelector<HTMLElement>('h2, h3, p');
    if (!target) return;
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }

  // Figures (:::figure in the Markdown) start once a step's prose is on the page and stop when
  // the kid moves to another step or leaves the lesson.
  let stopFigures = () => {};
  function renderStep(): void {
    stopFigures();
    queueMicrotask(() => { stopFigures = mountFigures(prose); });
    const mode = getMode();
    mount(checkList);
    const reminder = consoleColumn.querySelector('.lesson-reminder');
    if (reminder) reminder.textContent = lesson.sections.mission;

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
      // The mascot leans in from behind the edge of the boost, looking at the extra challenge.
      mount(prose,
        el('div', { class: 'boost-layout' },
          el('div', { class: 'boost-text' },
            el('h2', { text: 'Boost' }),
            renderMarkdown(lesson.sections.boost, { headingOffset: 2 }),
          ),
          el('div', { class: 'boost-peek', 'aria-hidden': 'true' }, mascot('peek', { height: 170, shadow: false })),
        ),
      );
      const next = nextLessonId(lesson.frontmatter.id);
      mount(actions,
        next ? el('a', { href: lessonHref(next), class: 'btn btn-next' }, el('span', { text: 'Next lesson' }), icon('next', 20)) : null,
        el('a', { href: '#/chart', class: 'btn btn-quiet' }, el('span', { text: 'Chart' })),
      );
      return;
    }

    // Mission, with the demo: the robot plays its route on the field while you read, and a
    // drawing of that route sits beside the mission so you know what you are aiming for.
    mount(prose,
      el('div', { class: 'mission-layout' },
        el('div', { class: 'mission-text' },
          el('p', { class: 'mission display', text: lesson.sections.mission }),
          el('p', { class: 'muted', text: `Tier ${lesson.frontmatter.tier}, ${tier?.name ?? ''}. About ${lesson.frontmatter.minutes} minutes.` }),
          el('p', { text: lesson.frontmatter.concept }),
          el('h2', { class: 'mission-watch-title', text: 'Watch' }),
          renderMarkdown(lesson.sections.watch, { headingOffset: 2 }),
        ),
        el('figure', { class: 'mission-target' },
          fieldThumb(routeOf(lesson.watch), { size: 140, label: 'The route the robot drives in this lesson' }),
          el('figcaption', { text: 'The route to aim for' }),
        ),
      ),
    );
    mount(actions,
      el('button', { type: 'button', class: 'btn', onclick: () => playTheDemo() }, icon('run', 20), el('span', { text: 'Play it again' })),
      el('button', { type: 'button', class: 'btn btn-next', onclick: () => goTo('learn') }, el('span', { text: 'Learn why' }), icon('next', 20)),
    );
    playTheDemo();
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
      caption.textContent = frame.caption ? `Demo: ${frame.caption}` : '';
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
    removeEventListener('resize', placeTrack);
    stopFigures();
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
