import { scroll } from 'motion';
import { prefersReducedMotion } from './dom';
import { playWatch } from '../sim/watch';
import { LESSON_ONE_RUN } from './heroDemo';
import type { Demo } from './pages/home';

/* The home page's scroll motion. Every piece here is scrubbed by scroll position (it runs
   forward and back with the reader), uses transform and opacity only, and exists to show
   something about the product:

   1. The field travels: the hero's simulator shrinks and moves into step 03 of "How a
      lesson works", then drives lesson 1's run as you scroll through that step.
   2. The steps light up in order while the band is pinned: read, change the number, run.
   3. The same file: two copies of Square.java slide together into one, and every line gets
      a tick, because the file you write here is the file Android Studio builds.
   4. The tier rows rise in once each, and each tier's line of Java types out.

   Motion's scroll() (3.9 KB gzipped) supplies the progress values; it uses the browser's
   ScrollTimeline where it can. Below 1181px wide, and under reduced motion, nothing pins
   or scrubs: the page shows every scene in its final state. See docs/DESIGN.md. */

const WIDE = '(min-width: 1181px)';
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const local = (t: number, from: number, to: number) => clamp01((t - from) / (to - from));

export function startHomeMotion(page: HTMLElement, demo: Demo): () => void {
  const cleanups: (() => void)[] = [];
  const reduced = prefersReducedMotion();

  // The rows are measured, so this waits until the page is in the document.
  let stopTiers = () => {};
  const tiersRaf = requestAnimationFrame(() => { stopTiers = revealTiers(page, reduced); });
  cleanups.push(() => {
    cancelAnimationFrame(tiersRaf);
    stopTiers();
  });

  const wide = matchMedia(WIDE);
  let scenes: (() => void) | null = null;
  const apply = () => {
    scenes?.();
    scenes = null;
    page.classList.toggle('nb-motion', wide.matches && !reduced);
    if (wide.matches && !reduced) scenes = startScenes(page, demo);
  };
  // Wait a frame so the hero has its final layout before anything is measured. Scenes are
  // measured once, so a resize rebuilds them (after the resizing stops).
  const raf = requestAnimationFrame(apply);
  wide.addEventListener('change', apply);
  let resizeTimer = 0;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(apply, 180);
  };
  addEventListener('resize', onResize);
  cleanups.push(() => {
    cancelAnimationFrame(raf);
    clearTimeout(resizeTimer);
    removeEventListener('resize', onResize);
    wide.removeEventListener('change', apply);
    scenes?.();
    page.classList.remove('nb-motion');
  });

  return () => cleanups.forEach((c) => c());
}

type Offsets = NonNullable<NonNullable<Parameters<typeof scroll>[1]>['offset']>;

/** Below the sticky header (68px) with a little air. */
const PIN_TOP = 84;

/** Sizes a pinned scene from what is actually on screen: the pin sits at PIN_TOP, the section
    is as tall as the pin plus `travel` of the window, and progress runs from the moment the pin
    sticks to the moment it lets go, so a scene always finishes while it is still pinned. A pin
    taller than the window cannot stick; then the scene is left in its final state. */
function pinScene(section: HTMLElement, pin: HTMLElement, travel: number): { start: Offsets[number]; end: Offsets[number] } | null {
  section.style.height = '';
  pin.style.top = '';
  const pinH = pin.offsetHeight;
  const fits = pinH + PIN_TOP + 8 <= innerHeight;
  section.classList.toggle('is-pinned-scene', fits);
  if (!fits) return null;
  section.style.height = `${Math.round(pinH + travel * innerHeight)}px`;
  pin.style.top = `${PIN_TOP}px`;
  return { start: `start ${PIN_TOP}px` as Offsets[number], end: `end ${PIN_TOP + pinH}px` as Offsets[number] };
}

function startScenes(page: HTMLElement, demo: Demo): () => void {
  const off: (() => void)[] = [];
  const how = page.querySelector<HTMLElement>('.nb-how')!;
  const slot = page.querySelector<HTMLElement>('.nb-run-slot')!;
  const steps = [...page.querySelectorAll<HTMLElement>('.nb-step')];
  const bars = steps.map((s) => s.querySelector<HTMLElement>('.nb-step-bar')!);
  const editNum = page.querySelector<HTMLElement>('.nb-edit-num')!;
  const circle = page.querySelector<SVGPathElement>('.nb-code-circle path')!;
  const runChecks = [...page.querySelectorAll<HTMLElement>('.nb-run-checks .nb-check')];
  const runCm = page.querySelector<HTMLElement>('.nb-run-cm')!;
  const pane = demo.fieldPane;
  const lessonFrames = playWatch(LESSON_ONE_RUN);

  // --- 1 and 2: the field's journey and the pinned steps. -------------------------------
  const howRange = pinScene(how, page.querySelector<HTMLElement>('.nb-how-pin')!, 0.8);
  // The pane's resting place, in page coordinates, measured without any transform on it.
  let home = { left: 0, top: 0, width: 1, height: 1 };
  const measure = () => {
    pane.style.transform = '';
    const r = pane.getBoundingClientRect();
    home = { left: r.left + scrollX, top: r.top + scrollY, width: r.width, height: r.height };
  };
  measure();

  let travel = 0;
  let band = 0;
  let lessonShown = -1;

  // Once it lands, the field moves into the pad itself. Left in the hero, it would have to be
  // pushed back by the scroll distance on every frame to stay on the sticky pad, and that
  // correction always arrives a frame after the browser has scrolled, so the field shook up
  // and down for the whole pinned band. Inside the pad, sticky positioning carries it natively.
  // A placeholder keeps the hero's size while it is away.
  const placeholder = document.createElement('div');
  placeholder.className = 'nb-field-placeholder';
  let docked = false;
  const dock = (on: boolean) => {
    if (on === docked) return;
    docked = on;
    if (on) {
      placeholder.style.width = `${home.width}px`;
      placeholder.style.height = `${home.height}px`;
      pane.before(placeholder);
      slot.append(pane);
      pane.classList.add('is-docked');
    } else {
      placeholder.replaceWith(pane);
      pane.classList.remove('is-docked');
    }
  };

  const render = () => {
    // Travel: from the hero to the landing pad in step 03. Until the band pins, the hero and
    // the pad scroll together, so the distance between them does not change with scroll and
    // only the eased progress moves the field.
    const t = ease(travel);
    if (travel >= 1) {
      dock(true);
      pane.style.transform = `scale(${slot.getBoundingClientRect().width / home.width})`;
    } else {
      dock(false);
      const pad = slot.getBoundingClientRect();
      const fromLeft = home.left - scrollX;
      const fromTop = home.top - scrollY;
      const scale = 1 + (pad.width / home.width - 1) * t;
      const x = (pad.left - fromLeft) * t;
      const y = (pad.top - fromTop) * t;
      pane.style.transform = travel > 0 ? `translate3d(${x}px, ${y}px, 0) scale(${scale})` : '';
    }
    pane.classList.toggle('is-travelling', travel > 0 && travel < 1);
    pane.classList.toggle('is-landed', travel >= 1);

    // Past halfway the field stops being the hero's square and becomes lesson 1's run.
    const lesson = travel >= 0.5;
    demo.hold(lesson);
    if (lesson) {
      const run = local(band, 0.68, 0.94);
      const index = Math.round(run * (lessonFrames.length - 1));
      if (index !== lessonShown) {
        lessonShown = index;
        demo.field.draw(lessonFrames[index]!.snapshot);
      }
    } else {
      lessonShown = -1;
    }

    // The steps: a third of the pinned scroll each, a bar filling across the active one.
    steps.forEach((s, i) => {
      const p = local(band, i / 3, (i + 1) / 3);
      bars[i]!.style.transform = `scaleX(${p})`;
      s.classList.toggle('is-active', band >= i / 3 && (band < (i + 1) / 3 || i === 2));
    });
    // Step 02: the number changes from 1000 to 2000 and the ink circle draws round it.
    const edit = local(band, 1 / 3, 2 / 3);
    editNum.textContent = edit > 0.35 ? '2000' : '1000';
    circle.style.strokeDashoffset = String(1 - local(edit, 0.4, 0.9));
    // Step 03: the checks pass one by one once the robot has stopped.
    runChecks.forEach((c, i) => c.classList.toggle('is-passed', band >= 0.94 + i * 0.02));
    runCm.classList.toggle('is-shown', band >= 0.94);
  };

  if (howRange) {
    off.push(scroll((p: number) => { travel = p; render(); }, { target: how, offset: ['start end', howRange.start] as Offsets }));
    off.push(scroll((p: number) => { band = p; render(); }, { target: how, offset: [howRange.start, howRange.end] as Offsets }));
    render();
  } else {
    // Too short a window to pin: the field stays in the hero and the band shows its end state.
    band = 1;
    render();
    demo.hold(false);
    pane.style.transform = '';
    for (const st of steps) st.classList.remove('is-active');
  }
  off.push(() => {
    how.style.height = '';
    how.classList.remove('is-pinned-scene');
  });

  // --- 3: the same file, merging. --------------------------------------------------------
  // Apart, side by side; both slide to the middle until Android Studio's copy lies exactly
  // over ours; its header crossfades into ours (the code under it is the same text, so nothing
  // else changes); then every line is ticked, top to bottom.
  const same = page.querySelector<HTMLElement>('.nb-same')!;
  const sameRange = pinScene(same, same.querySelector<HTMLElement>('.nb-same-pin')!, 0.7);
  const ours = same.querySelector<HTMLElement>('.nb-same-panel.is-ours')!;
  const theirs = same.querySelector<HTMLElement>('.nb-same-panel.is-theirs')!;
  const theirsBar = theirs.querySelector<HTMLElement>('.nb-same-bar')!;
  const theirsLabels = [...theirsBar.children] as HTMLElement[];
  const oursLabels = [...ours.querySelector<HTMLElement>('.nb-same-bar')!.children] as HTMLElement[];
  const ticks = [...same.querySelectorAll<HTMLElement>('.is-ours .nb-same-tick')];
  const verdict = same.querySelector<HTMLElement>('.nb-same-verdict')!;
  const merge = (m: number) => {
    const slide = ease(local(m, 0.04, 0.58));
    const apart = (ours.offsetWidth + 32) / 2;
    ours.style.transform = `translate3d(${-apart * (1 - slide)}px, 0, 0)`;
    theirs.style.transform = `translate3d(${apart * (1 - slide)}px, 0, 0)`;
    // The header swap is in two beats so the two names never overlap: Android Studio's fades
    // out over its own header, then the panel above goes and Nebula's name fades in.
    for (const l of theirsLabels) l.style.opacity = String(1 - local(m, 0.6, 0.66));
    theirs.style.visibility = m >= 0.66 ? 'hidden' : '';
    for (const l of oursLabels) l.style.opacity = m < 0.58 ? '' : String(local(m, 0.66, 0.72));
    const tick = local(m, 0.74, 0.94);
    ticks.forEach((t, i) => t.classList.toggle('is-shown', tick * ticks.length > i));
    verdict.style.opacity = String(local(m, 0.9, 1));
  };
  if (sameRange) off.push(scroll(merge, { target: same, offset: [sameRange.start, sameRange.end] as Offsets }));
  else merge(1);
  off.push(() => {
    same.style.height = '';
    same.classList.remove('is-pinned-scene');
  });

  return () => {
    off.forEach((f) => f());
    dock(false);
    demo.hold(false);
    pane.style.transform = '';
    pane.classList.remove('is-travelling', 'is-landed');
    for (const el of [ours, theirs, theirsBar, verdict, ...theirsLabels, ...oursLabels]) {
      el.style.transform = '';
      el.style.opacity = '';
    }
    theirs.style.visibility = '';
    for (const b of bars) b.style.transform = '';
    editNum.textContent = '2000';
    circle.style.strokeDashoffset = '';
    for (const c of runChecks) c.classList.add('is-passed');
    for (const t of ticks) t.classList.add('is-shown');
    for (const s of steps) s.classList.remove('is-active');
  };
}

// --- 4: the tier rows. -----------------------------------------------------------------------
/** When the notebook page comes into view, all six rows rise in and their lines of Java type
    out, the whole sequence done within 600 ms so the page is never an empty sheet. Nothing is
    hidden ahead of time: each row's own first keyframe hides it only while it plays. A page
    already on screen when the home page opens is left as it is. */
function revealTiers(page: HTMLElement, reduced: boolean): () => void {
  const paper = page.querySelector<HTMLElement>('.nb-paper');
  const rows = [...page.querySelectorAll<HTMLElement>('.nb-tier')];
  if (!paper || reduced || !('IntersectionObserver' in window)) return () => {};
  if (paper.getBoundingClientRect().top < innerHeight) return () => {};
  const typing = matchMedia('(min-width: 768px)').matches;
  const easing = 'cubic-bezier(0.16, 1, 0.3, 1)';
  const io = new IntersectionObserver(([entry]) => {
    if (!entry?.isIntersecting) return;
    io.disconnect();
    rows.forEach((row, i) => {
      const delay = i * 48;
      row.animate(
        [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
        { duration: 360, delay, easing, fill: 'backwards' },
      );
      const line = row.querySelector<HTMLElement>('.nb-tier-code');
      if (line && typing) {
        const chars = line.textContent?.length ?? 20;
        line.animate(
          [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }],
          { duration: 300, delay: delay + 60, easing: `steps(${chars}, end)`, fill: 'backwards' },
        );
      }
    });
  }, { threshold: 0.08 });
  io.observe(paper);
  return () => io.disconnect();
}
