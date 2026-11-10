import { svg, el } from '../dom';
import { pathway, loadLesson } from '../../content/loader';
import { isPassed, isTierUnlocked } from '../../progress/store';
import { lessonHref } from '../router';
import { ensureInk, fieldThumb, routeOf, tierEmblem } from '../kit';
import { mascotHead } from '../mascot';

/* The star chart.

   Tiers are stations, drawn as nodes with their emblem; lessons are small stars along the
   route. Every row runs left to right with its station and label at the left edge, so the
   names line up in one column and read top to bottom like a contents page; the route drops
   from the end of each row to the next station.

   States are carried by SHAPE as well as colour, so the chart works in greyscale and for a
   colourblind kid: a flown lesson is a filled star, an open one an outlined star, a locked
   one a small hollow dot. The flown route is inked in yellow with the kit's wobble; the
   route still to fly is a dotted hairline.

   Motion: on the first visit of a session the route draws itself station by station
   (1.2 s, out-quart); the current lesson's star breathes between 0.7 and 1 opacity on a
   2 s loop; hovering or focusing a station brightens its whole tier. Reduced motion gets
   the finished chart and no loop. */

const W = 1200;
const ROW_H = 150;
const TOP = 96;
const LABEL_X = 28;
const NODE_X = 248;
const FIRST_X = 352;
const ROUTE_STEP = 108;
const HIT_R = 30;
const DRAW_MS = 1200;
const OUT_QUART = 'cubic-bezier(0.25, 1, 0.5, 1)';

let drawnThisSession = false;

/** A seeded generator, so the chart's hand-drawn sway is the same every render. */
function rng(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (Math.imul(state, 1103515245) + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

interface Point { x: number; y: number }

/** A line as one gentle curve, so it reads as plotted by hand rather than ruled. */
function curve(from: Point, to: Point, seed: number, bow = 10): string {
  const random = rng(seed);
  const mx = (from.x + to.x) / 2 + (random() - 0.5) * bow;
  const my = (from.y + to.y) / 2 + (random() - 0.5) * bow;
  return `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
}

/** A four-point star, the lesson mark. */
function starPath(c: Point, r: number): string {
  const i = r * 0.38;
  return `M ${c.x} ${c.y - r} Q ${c.x + i * 0.35} ${c.y - i * 0.35} ${c.x + r} ${c.y} Q ${c.x + i * 0.35} ${c.y + i * 0.35} ${c.x} ${c.y + r} Q ${c.x - i * 0.35} ${c.y + i * 0.35} ${c.x - r} ${c.y} Q ${c.x - i * 0.35} ${c.y - i * 0.35} ${c.x} ${c.y - r} Z`;
}

function stationAt(index: number): Point {
  return { x: NODE_X, y: TOP + index * ROW_H };
}

function waypointsFor(station: Point, count: number, seed: number): Point[] {
  const random = rng(seed);
  return Array.from({ length: count }, (_, i) => ({
    x: FIRST_X + ROUTE_STEP * i,
    y: station.y + Math.sin(i * 1.3 + seed) * 12 + (random() - 0.5) * 6,
  }));
}

export interface StarChart {
  element: HTMLElement;
  /** Plays the route-extension animation towards a lesson, then leaves it lit. */
  celebrate(lessonId: string): void;
}

export function createStarChart(options: { reducedMotion: boolean }): StarChart {
  ensureInk();
  const tiers = pathway.tiers;
  const stations = tiers.map((_, i) => stationAt(i));
  const H = TOP + (tiers.length - 1) * ROW_H + 90;

  const root = svg('svg', {
    viewBox: `0 0 ${W} ${H}`,
    class: 'chart on-dark',
    role: 'group',
    'aria-label': 'Star chart of the six tiers and their lessons',
    preserveAspectRatio: 'xMidYMid meet',
  });

  // Background stars: scattered, seeded, three sizes, still.
  const stars = rng(80231);
  const starLayer = svg('g', { class: 'chart-stars', 'aria-hidden': 'true' });
  for (let i = 0; i < 200; i++) {
    const x = stars() * W;
    const y = stars() * H;
    const r = stars() < 0.08 ? 1.7 : stars() < 0.4 ? 1.1 : 0.6;
    starLayer.appendChild(svg('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r, class: 'chart-star' }));
  }
  root.appendChild(starLayer);

  const routeLayer = svg('g', { class: 'chart-routes' });
  const waypointLayer = svg('g', { class: 'chart-waypoints' });
  const stationLayer = svg('g', { class: 'chart-stations' });
  root.append(routeLayer, waypointLayer, stationLayer);

  const waypointNodes = new Map<string, SVGElement>();
  const tierOfNode = new Map<Element, number>();
  // The lesson a kid would open next: the first one not flown in the furthest open tier.
  const currentId = (() => {
    for (const t of [...tiers].reverse()) {
      if (!isTierUnlocked(t.tier)) continue;
      return t.lessons.find((l) => !isPassed(l.id))?.id ?? null;
    }
    return null;
  })();

  const frame = el('div', { class: 'chart-canvas' }, root);
  const tooltip = el('div', { class: 'chart-tip', 'aria-hidden': 'true', hidden: true });
  frame.append(tooltip);

  tiers.forEach((tier, index) => {
    const station = stations[index]!;
    const unlocked = isTierUnlocked(tier.tier);
    const points = waypointsFor(station, tier.lessons.length, 1000 + tier.tier * 7);
    const tierTag = { 'data-tier': String(tier.tier) };

    // The route through this tier's lessons: flown, open (to fly next) or locked.
    const segments: Point[] = [{ x: station.x + 30, y: station.y }, ...points];
    for (let i = 0; i < segments.length - 1; i++) {
      const flown = isPassed(tier.lessons[i]!.id);
      const state = flown ? 'is-flown' : unlocked ? 'is-open' : 'is-locked';
      routeLayer.appendChild(svg('path', {
        d: curve(segments[i]!, segments[i + 1]!, 500 + tier.tier * 31 + i, 8),
        class: `chart-route ${state}`,
        ...tierTag,
        ...(flown ? { filter: 'url(#kit-wobble)' } : {}),
      }));
    }

    // The drop to the next station, flown once this tier's checkpoint passes.
    if (index < tiers.length - 1) {
      const done = isPassed(tier.checkpoint);
      const from = points[points.length - 1] ?? station;
      const to = { x: stations[index + 1]!.x + 22, y: stations[index + 1]!.y - 22 };
      routeLayer.appendChild(svg('path', {
        d: `M ${from.x} ${from.y} C ${from.x + 40} ${from.y + ROW_H * 0.55}, ${to.x + 260} ${to.y - ROW_H * 0.45}, ${to.x} ${to.y}`,
        class: `chart-hop ${done ? 'is-flown' : 'is-locked'}`,
        ...tierTag,
        ...(done ? { filter: 'url(#kit-wobble)' } : {}),
      }));
    }

    tier.lessons.forEach((lesson, i) => {
      const point = points[i]!;
      const passed = isPassed(lesson.id);
      const open = unlocked && !passed;
      const current = lesson.id === currentId;
      const state = `${passed ? 'is-flown' : open ? 'is-open' : 'is-locked'}${current ? ' is-current' : ''}`;
      const label = `Tier ${tier.tier} lesson ${i + 1}: ${lesson.title}${passed ? ', flown' : unlocked ? '' : ', locked'}`;

      const group = svg('g', { class: `chart-waypoint ${state}`, ...tierTag });
      group.appendChild(svg('circle', { cx: point.x, cy: point.y, r: HIT_R, class: 'chart-hit' }));
      if (passed || open) {
        group.appendChild(svg('path', { d: starPath(point, current ? 11 : 9), class: 'chart-mark' }));
      } else {
        group.appendChild(svg('circle', { cx: point.x, cy: point.y, r: 4, class: 'chart-mark' }));
      }
      if (current) {
        // The mascot sits on the lesson you are up to, in place of its number.
        const head = mascotHead(26);
        head.setAttribute('x', String(point.x - 12));
        head.setAttribute('y', String(point.y - 46));
        head.classList.add('chart-you');
        group.appendChild(head);
      } else {
        group.appendChild(svg('text', {
          x: point.x, y: point.y - 20, class: 'chart-waypoint-label', 'text-anchor': 'middle', 'aria-hidden': 'true', text: String(i + 1),
        }));
      }

      const node = unlocked
        ? svg('a', { href: lessonHref(lesson.id), 'aria-label': label, class: 'chart-link', ...tierTag }, group)
        : (() => {
            // A labelled <g> needs a role, or the label is ignored (axe aria-prohibited-attr).
            group.setAttribute('role', 'img');
            group.setAttribute('aria-label', label);
            return group;
          })();
      waypointLayer.appendChild(node);
      waypointNodes.set(lesson.id, node);
      tierOfNode.set(node, tier.tier);

      const show = () => showTip(lesson.id, lesson.title, unlocked ? null : `Opens after the Tier ${tier.tier - 1} checkpoint`, point);
      node.addEventListener('pointerenter', show);
      node.addEventListener('focus', show);
      node.addEventListener('pointerleave', hideTip);
      node.addEventListener('blur', hideTip);
    });

    // The station: a node with the tier's emblem, and its label in the left column.
    const passedCount = tier.lessons.filter((l) => isPassed(l.id)).length;
    const total = tier.lessons.length;
    const box = svg('g', { class: `chart-station ${unlocked ? 'is-open' : 'is-locked'}`, ...tierTag });
    box.appendChild(svg('rect', { x: LABEL_X - 12, y: station.y - 36, width: station.x + 44 - LABEL_X, height: 72, rx: 12, class: 'chart-station-hit' }));
    box.appendChild(svg('circle', { cx: station.x, cy: station.y, r: 30, class: 'chart-station-node' }));
    const emblem = tierEmblem(tier.tier, 32);
    emblem.setAttribute('x', String(station.x - 16));
    emblem.setAttribute('y', String(station.y - 16));
    emblem.classList.add('chart-station-emblem');
    box.appendChild(emblem);
    box.appendChild(svg('text', { x: LABEL_X, y: station.y - 6, class: 'chart-station-tier', text: `Tier ${tier.tier}` }));
    box.appendChild(svg('text', { x: LABEL_X, y: station.y + 18, class: 'chart-station-name', text: tier.name }));
    box.appendChild(svg('text', {
      x: LABEL_X, y: station.y + 40, class: 'chart-station-count',
      text: unlocked ? `${passedCount} of ${total}` : 'locked',
    }));

    const nextLesson = tier.lessons.find((l) => !isPassed(l.id)) ?? tier.lessons[0];
    let stationNode: SVGElement;
    if (unlocked && nextLesson) {
      // Chrome names an SVG link from its <title>. The title starts with the badge's own
      // words ("Tier 0 Launchpad 0 of 4"), so voice control can say what it sees (WCAG 2.5.3).
      stationNode = svg('a', { href: lessonHref(nextLesson.id), class: 'chart-station-link', ...tierTag },
        svg('title', { text: `Tier ${tier.tier} ${tier.name} ${passedCount} of ${total}. Next lesson: ${nextLesson.title}` }),
        box);
    } else {
      box.setAttribute('role', 'img');
      box.setAttribute('aria-label', `Tier ${tier.tier}, ${tier.name}, locked`);
      stationNode = box;
    }
    stationLayer.appendChild(stationNode);
    const light = () => lightTier(tier.tier);
    stationNode.addEventListener('pointerenter', light);
    stationNode.addEventListener('focusin', light);
    stationNode.addEventListener('pointerleave', unlight);
    stationNode.addEventListener('focusout', unlight);
  });

  /** Hovering a station brightens its own tier and dims the rest. */
  function lightTier(tier: number): void {
    root.classList.add('is-focusing');
    for (const node of root.querySelectorAll('[data-tier]')) {
      node.classList.toggle('is-lit', node.getAttribute('data-tier') === String(tier));
    }
  }
  function unlight(): void {
    root.classList.remove('is-focusing');
  }

  // The tooltip: the lesson's route as a field thumbnail, its name and how long it takes.
  // It loads the lesson the first time it is needed; the link's own label already says
  // everything a screen reader needs, so the tip is hidden from it.
  const tipCache = new Map<string, Promise<{ thumb: SVGElement; minutes: number }>>();
  let tipFor = '';
  function showTip(id: string, title: string, lockedNote: string | null, point: Point): void {
    tipFor = id;
    const thumbSlot = el('div', { class: 'chart-tip-thumb' });
    const minutes = el('span', { class: 'chart-tip-min', text: lockedNote ?? '' });
    tooltip.replaceChildren(thumbSlot, el('div', { class: 'chart-tip-text' }, el('strong', { text: title }), minutes));
    tooltip.hidden = false;
    place(point);
    if (!tipCache.has(id)) {
      tipCache.set(id, loadLesson(id).then((lesson) => ({
        thumb: fieldThumb(routeOf(lesson.watch), { size: 88, label: '' }),
        minutes: lesson.frontmatter.minutes,
      })));
    }
    void tipCache.get(id)!.then(({ thumb, minutes: min }) => {
      if (tipFor !== id) return;
      thumbSlot.replaceChildren(thumb.cloneNode(true));
      if (!lockedNote) minutes.textContent = `${min} min`;
      place(point);
    }).catch(() => undefined);
  }
  function hideTip(): void {
    tipFor = '';
    tooltip.hidden = true;
  }
  function place(point: Point): void {
    const box = root.getBoundingClientRect();
    const host = frame.getBoundingClientRect();
    const scale = box.width / W;
    const x = box.left - host.left + frame.scrollLeft + point.x * scale;
    const y = box.top - host.top + point.y * scale;
    const w = tooltip.offsetWidth;
    const left = Math.min(Math.max(8, x - w / 2), frame.scrollWidth - w - 8);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${y + 26}px`;
  }

  // The route draws itself station by station, once a session.
  if (!options.reducedMotion && !drawnThisSession) {
    drawnThisSession = true;
    requestAnimationFrame(() => drawIn(root, tiers.length));
  }

  return {
    element: frame,
    celebrate(lessonId: string) {
      const node = waypointNodes.get(lessonId);
      if (!node) return;
      node.querySelector('.chart-waypoint')?.classList.add('is-flown');
      node.classList.add('is-flown');
      if (options.reducedMotion) return;
      const tier = tierOfNode.get(node);
      const paths = root.querySelectorAll<SVGPathElement>(`.chart-route[data-tier='${tier}']`);
      for (const path of paths) drawPath(path, 0, 700);
    },
  };
}

/** Each tier's route draws in turn, so the whole chart lands in 1.2 s; the locked dotted
    lines and the stations fade in alongside rather than draw. Transform-free: dash offset on
    pathLength 1 paths, and opacity. */
function drawIn(root: SVGElement, tierCount: number): void {
  const slot = DRAW_MS / tierCount;
  for (let t = 0; t < tierCount; t++) {
    const delay = t * slot * 0.8;
    for (const path of root.querySelectorAll<SVGPathElement>(`.chart-route[data-tier='${t}']:not(.is-locked), .chart-hop.is-flown[data-tier='${t}']`)) {
      drawPath(path, delay, slot * 1.4);
    }
    for (const node of root.querySelectorAll<SVGElement>(`.chart-station[data-tier='${t}'], .chart-waypoint[data-tier='${t}'], .chart-route.is-locked[data-tier='${t}'], .chart-hop.is-locked[data-tier='${t}']`)) {
      node.animate([{ opacity: 0 }, { opacity: 1 }], { duration: slot * 1.4, delay, easing: OUT_QUART, fill: 'backwards' });
    }
  }
}

function drawPath(path: SVGPathElement, delay: number, duration: number): void {
  path.setAttribute('pathLength', '1');
  path.style.strokeDasharray = '1 1';
  const anim = path.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration, delay, easing: OUT_QUART, fill: 'backwards' });
  anim.finished.then(() => {
    path.style.strokeDasharray = '';
    path.removeAttribute('pathLength');
  }).catch(() => undefined);
}
