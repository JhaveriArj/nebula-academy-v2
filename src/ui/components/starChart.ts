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
const H = 700;

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

/** Waypoints run from just outside this tier's station towards the next one. */
function waypointsFor(station: Point, towards: Point, count: number, seed: number): Point[] {
  const random = rng(seed);
  const dx = towards.x - station.x;
  const dy = towards.y - station.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const start = 78;
  const span = Math.min(length - 150, 34 * count);
  const gap = count > 1 ? span / (count - 1) : 0;

  return Array.from({ length: count }, (_, i) => {
    const along = start + gap * i;
    const sway = (random() - 0.5) * 16;
    return {
      x: station.x + ux * along - uy * sway,
      y: station.y + uy * along + ux * sway,
    };
  });
}

export interface StarChart {
  element: SVGElement;
  /** Plays the route-extension animation towards a lesson, then leaves it lit. */
  celebrate(lessonId: string): void;
}

export function createStarChart(options: { reducedMotion: boolean }): StarChart {
  const tiers = pathway.tiers;
  const stations = tiers.map((t) => t.station);

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
  for (let i = 0; i < 150; i++) {
    const x = stars() * W;
    const y = stars() * H;
    const r = stars() < 0.08 ? 1.9 : stars() < 0.4 ? 1.2 : 0.7;
    starLayer.appendChild(svg('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r, class: 'chart-star' }));
  }
  root.appendChild(starLayer);

  // Coordinate ticks down the margins, like a real chart.
  const ticks = svg('g', { class: 'chart-ticks', 'aria-hidden': 'true' });
  for (let i = 1; i < 12; i++) {
    const x = (W / 12) * i;
    ticks.appendChild(svg('path', { d: `M ${x} 8 V ${i % 3 === 0 ? 22 : 15}` }));
    const y = (H / 8) * (i % 8);
    if (i < 8) ticks.appendChild(svg('path', { d: `M 8 ${y} H ${i % 2 === 0 ? 22 : 15}` }));
  }
  root.appendChild(ticks);

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
    const next = stations[index + 1] ?? { x: station.x + 220, y: station.y - 120 };
    const unlocked = isTierUnlocked(tier.tier);
    const points = waypointsFor(station, next, tier.lessons.length, 1000 + tier.tier * 7);

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

      const label = `Tier ${tier.tier} lesson ${i + 1}, ${lesson.id}${
        passed ? ', flown' : unlocked ? '' : ', locked'
      }`;

      const group = svg('g', { class: `chart-waypoint ${state}` });
      // A 22px transparent circle keeps the tap target at 44px, per CLAUDE.md.
      group.appendChild(svg('circle', { cx: point.x, cy: point.y, r: 22, class: 'chart-hit' }));
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
          y: point.y - 15,
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
    box.appendChild(
      svg('path', {
        d: stationOutline(station, 1700 + tier.tier * 13),
        class: 'chart-station-shell',
      }),
    );
    box.appendChild(
      svg('text', {
        x: station.x,
        y: station.y - 4,
        'text-anchor': 'middle',
        class: 'chart-station-name',
        text: tier.name.toUpperCase(),
      }),
    );
    box.appendChild(
      svg('text', {
        x: station.x,
        y: station.y + 15,
        'text-anchor': 'middle',
        class: 'chart-station-count',
        text: unlocked ? `${passed} of ${total}` : 'locked',
      }),
    );
    stationLayer.appendChild(box);
  });

  // Margin annotations, in the chart's own handwriting.
  const total = tiers.reduce((n, t) => n + t.lessons.length, 0);
  const flown = tiers.reduce((n, t) => n + t.lessons.filter((l) => isPassed(l.id)).length, 0);
  root.appendChild(
    svg('text', { x: 24, y: H - 20, class: 'chart-note', text: `${flown} of ${total} waypoints logged` }),
  );
  root.appendChild(
    svg('text', { x: W - 24, y: H - 20, class: 'chart-note', 'text-anchor': 'end', text: 'N  0 — 12 ft' }),
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
function stationOutline(centre: Point, seed: number): string {
  const random = rng(seed);
  const w = 112;
  const h = 54;
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
