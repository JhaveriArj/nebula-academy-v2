import { svg } from '../dom';
import { pathway } from '../../content/loader';
import { isPassed, isTierUnlocked } from '../../progress/store';
import { lessonHref } from '../router';

/* The Level Map.

   docs/DESIGN.md spends the project's whole boldness budget here: a hand-inked
   navigational star chart where tiers are stations and lessons are waypoints on a flown
   route. Every other screen is flat paint and type.

   Two rules it keeps. Waypoint states are distinguishable by SHAPE as well as colour, so
   the chart works in greyscale and for a colourblind kid. And the only animation is the
   route extending when a lesson is completed, which is the whole celebration. */

const W = 1200;
const H = 1040;

/** A seeded generator, so the chart's hand-drawn wobble is the same every render. */
function rng(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (Math.imul(state, 1103515245) + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

interface Point {
  x: number;
  y: number;
}

/** A straight line redrawn as a few wobbled segments, so it reads as inked by hand. */
function wobbled(from: Point, to: Point, seed: number, amount = 5): string {
  const random = rng(seed);
  const steps = 6;
  const parts = [`M ${from.x.toFixed(1)} ${from.y.toFixed(1)}`];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const jitter = i === steps ? 0 : (random() - 0.5) * amount * 2;
    const nx = from.x + (to.x - from.x) * t + jitter;
    const ny = from.y + (to.y - from.y) * t + (i === steps ? 0 : (random() - 0.5) * amount * 2);
    parts.push(`L ${nx.toFixed(1)} ${ny.toFixed(1)}`);
  }
  return parts.join(' ');
}

/** Waypoints run from just outside this tier's station towards the next one.

    The span is capped at a little over half the distance to the next station so a long
    tier never crowds into it, and at 30 px a waypoint so a short tier does not stretch
    its handful of waypoints across the whole chart. */
/* The layout. One tier per row, the route switching back at the end of each row like a
   trail down a mountain: Tier 0 runs left to right, Tier 1 right to left, and so on. Every
   waypoint sits ROUTE_STEP apart, which is what lets each one carry a full-size tap target
   (HIT_R) without overlapping its neighbour, even on a 1024 px screen. The positions are
   worked out here rather than read from content/pathway.json, so the chart can never be
   laid out too tight by a content edit. */
const ROW_H = 160;
const TOP = 110;
const ROUTE_STEP = 112;
const HIT_R = 30;

function stationAt(index: number): Point {
  return { x: index % 2 === 0 ? 150 : W - 150, y: TOP + index * ROW_H };
}

function waypointsFor(index: number, station: Point, count: number, seed: number): Point[] {
  const random = rng(seed);
  const dir = index % 2 === 0 ? 1 : -1;
  return Array.from({ length: count }, (_, i) => ({
    x: station.x + dir * (170 + ROUTE_STEP * i),
    // A gentle, seeded sway so the route reads as hand-plotted, not ruled.
    y: station.y + Math.sin(i * 1.3 + seed) * 14 + (random() - 0.5) * 6,
  }));
}

export interface StarChart {
  element: SVGElement;
  /** Plays the route-extension animation towards a lesson, then leaves it lit. */
  celebrate(lessonId: string): void;
}

export function createStarChart(options: { reducedMotion: boolean }): StarChart {
  const tiers = pathway.tiers;
  const stations = tiers.map((_, i) => stationAt(i));

  const root = svg('svg', {
    viewBox: `0 0 ${W} ${H}`,
    class: 'chart on-dark',
    role: 'group',
    'aria-label': 'Star chart of the six tiers and their lessons',
    preserveAspectRatio: 'xMidYMid meet',
  });

  // Stars. Scattered, seeded, three sizes, never animated.
  const stars = rng(80231);
  const starLayer = svg('g', { class: 'chart-stars', 'aria-hidden': 'true' });
  for (let i = 0; i < 220; i++) {
    const x = stars() * W;
    const y = stars() * H;
    const r = stars() < 0.08 ? 1.9 : stars() < 0.4 ? 1.2 : 0.7;
    starLayer.appendChild(svg('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r, class: 'chart-star' }));
  }
  root.appendChild(starLayer);

  // (The margin ticks and the "N 0 — 12 ft" scale were removed: a star chart has no scale a
  // kid can use, so they read as noise. The field, which does, keeps its rulers.)

  const routeLayer = svg('g', { class: 'chart-routes' });
  const waypointLayer = svg('g', { class: 'chart-waypoints' });
  const stationLayer = svg('g', { class: 'chart-stations' });
  root.appendChild(routeLayer);
  root.appendChild(waypointLayer);
  root.appendChild(stationLayer);

  const routeToNext: (SVGElement | null)[] = [];
  const waypointNodes = new Map<string, SVGElement>();

  tiers.forEach((tier, index) => {
    const station = stations[index]!;
    const unlocked = isTierUnlocked(tier.tier);
    const points = waypointsFor(index, station, tier.lessons.length, 1000 + tier.tier * 7);

    // The route through this tier's waypoints.
    const segments: Point[] = [station, ...points];
    for (let i = 0; i < segments.length - 1; i++) {
      const flown = isPassed(tier.lessons[i]!.id);
      routeLayer.appendChild(
        svg('path', {
          d: wobbled(segments[i]!, segments[i + 1]!, 500 + tier.tier * 31 + i, 3),
          class: `chart-route ${flown ? 'is-flown' : unlocked ? 'is-open' : 'is-locked'}`,
        }),
      );
    }

    // The hop to the next station, flown once this tier's checkpoint passes.
    if (index < tiers.length - 1) {
      const done = isPassed(tier.checkpoint);
      const hop = svg('path', {
        d: wobbled(points[points.length - 1] ?? station, stations[index + 1]!, 900 + tier.tier, 7),
        class: `chart-hop ${done ? 'is-flown' : 'is-locked'}`,
      });
      routeLayer.appendChild(hop);
      routeToNext.push(hop);
    } else {
      routeToNext.push(null);
    }

    // Waypoints. Shape carries the state; amber only confirms it.
    tier.lessons.forEach((lesson, i) => {
      const point = points[i]!;
      const passed = isPassed(lesson.id);
      const open = unlocked && !passed;
      const state = passed ? 'is-flown' : open ? 'is-open' : 'is-locked';

      const label = `Tier ${tier.tier} lesson ${i + 1}: ${lesson.title}${
        passed ? ', flown' : unlocked ? '' : ', locked'
      }`;

      const group = svg('g', { class: `chart-waypoint ${state}` });
      // A transparent circle around the mark is the tap target: 60 units across, about
      // 49 px on a 1024 px screen, and never overlapping the next waypoint.
      group.appendChild(svg('circle', { cx: point.x, cy: point.y, r: HIT_R, class: 'chart-hit' }));
      if (passed) {
        group.appendChild(svg('circle', { cx: point.x, cy: point.y, r: 6.5, class: 'chart-dot' }));
      } else if (open) {
        group.appendChild(svg('circle', { cx: point.x, cy: point.y, r: 6.5, class: 'chart-ring' }));
        group.appendChild(svg('circle', { cx: point.x, cy: point.y, r: 2.4, class: 'chart-dot' }));
      } else {
        group.appendChild(svg('circle', { cx: point.x, cy: point.y, r: 5.5, class: 'chart-hollow' }));
      }
      group.appendChild(
        svg('text', {
          x: point.x,
          y: point.y - 22,
          class: 'chart-waypoint-label',
          'text-anchor': 'middle',
          'aria-hidden': 'true',
          text: String(i + 1),
        }),
      );

      if (unlocked) {
        const link = svg('a', { href: lessonHref(lesson.id), 'aria-label': label, class: 'chart-link' });
        link.appendChild(group);
        waypointLayer.appendChild(link);
        waypointNodes.set(lesson.id, link);
      } else {
        // A labelled <g> needs a role, or the label is ignored (axe aria-prohibited-attr).
        group.setAttribute('role', 'img');
        group.setAttribute('aria-label', label);
        waypointLayer.appendChild(group);
        waypointNodes.set(lesson.id, group);
      }
    });

    // The station itself.
    const { passed, total } = {
      passed: tier.lessons.filter((l) => isPassed(l.id)).length,
      total: tier.lessons.length,
    };
    const box = svg('g', { class: `chart-station ${unlocked ? 'is-open' : 'is-locked'}` });
    // The badge grows with its name, so the name can be set large enough to read at 1024 px.
    // Room for the tier's patch on the left, then the name.
    const width = Math.max(150, Math.round(tier.name.length * 11.5 + 84));
    const left = station.x - width / 2;
    box.appendChild(
      svg('path', {
        d: stationOutline(station, 1700 + tier.tier * 13, width, 64),
        class: 'chart-station-shell',
      }),
    );
    box.appendChild(
      svg('image', {
        href: `${import.meta.env.BASE_URL}art/badge-t${tier.tier}.svg`,
        x: left + 10,
        y: station.y - 20,
        width: 40,
        height: 40,
        class: 'chart-station-badge',
        'aria-hidden': 'true',
      }),
    );
    box.appendChild(
      svg('text', {
        x: station.x + 24,
        y: station.y - 3,
        'text-anchor': 'middle',
        class: 'chart-station-name',
        text: tier.name,
      }),
    );
    box.appendChild(
      svg('text', {
        x: station.x + 24,
        y: station.y + 20,
        'text-anchor': 'middle',
        class: 'chart-station-count',
        text: unlocked ? `${passed} of ${total}` : 'locked',
      }),
    );
    // An open station is the big target: it goes to the tier's next lesson.
    const nextLesson = tier.lessons.find((l) => !isPassed(l.id)) ?? tier.lessons[0];
    if (unlocked && nextLesson) {
      // Chrome names an SVG link from its <title>. The title starts with the badge's own
      // words ("Launchpad 0 of 4"), so voice control can say what it sees (WCAG 2.5.3).
      const link = svg('a', { href: lessonHref(nextLesson.id), class: 'chart-station-link' });
      link.appendChild(svg('title', { text: `${tier.name} ${passed} of ${total}. Next lesson: ${nextLesson.title}` }));
      link.appendChild(box);
      stationLayer.appendChild(link);
    } else {
      box.setAttribute('role', 'img');
      box.setAttribute('aria-label', `${tier.name}, locked, tier ${tier.tier}`);
      stationLayer.appendChild(box);
    }
  });

  // Margin annotations, in the chart's own handwriting.
  const total = tiers.reduce((n, t) => n + t.lessons.length, 0);
  const flown = tiers.reduce((n, t) => n + t.lessons.filter((l) => isPassed(l.id)).length, 0);
  root.appendChild(
    svg('text', { x: 24, y: H - 20, class: 'chart-note', text: `${flown} of ${total} waypoints logged` }),
  );

  return {
    element: root,
    celebrate(lessonId: string) {
      const node = waypointNodes.get(lessonId);
      if (!node) return;
      node.classList.add('is-flown');
      if (options.reducedMotion) return;
      // The one piece of motion in the project: the route reaches the next waypoint.
      const route = routeLayer.querySelectorAll('.chart-route');
      for (const path of route) path.classList.add('is-extending');
      setTimeout(() => {
        for (const path of route) path.classList.remove('is-extending');
      }, 1000);
    },
  };
}

/** A station drawn as a wobbled rounded box, not a perfect rectangle. */
function stationOutline(centre: Point, seed: number, w = 112, h = 54): string {
  const random = rng(seed);
  const jitter = () => (random() - 0.5) * 4;
  const l = centre.x - w / 2;
  const r = centre.x + w / 2;
  const t = centre.y - h / 2;
  const b = centre.y + h / 2;
  return [
    `M ${l + 10 + jitter()} ${t + jitter()}`,
    `L ${r - 10 + jitter()} ${t + jitter()}`,
    `L ${r + jitter()} ${t + 12 + jitter()}`,
    `L ${r + jitter()} ${b - 12 + jitter()}`,
    `L ${r - 10 + jitter()} ${b + jitter()}`,
    `L ${l + 10 + jitter()} ${b + jitter()}`,
    `L ${l + jitter()} ${b - 12 + jitter()}`,
    `L ${l + jitter()} ${t + 12 + jitter()}`,
    'Z',
  ].join(' ');
}
