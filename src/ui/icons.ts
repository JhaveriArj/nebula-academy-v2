import { svg } from './dom';

/* The icon set, drawn by hand. docs/DESIGN.md: 24x24, 1.75px stroke, square cap, no
   fill, and no emoji anywhere — a screen reader would read one aloud mid-sentence. */

const PATHS: Record<string, string[]> = {
  run: ['M7 4.5 L19 12 L7 19.5 Z'],
  stop: ['M6.5 6.5 h11 v11 h-11 Z'],
  pause: ['M8.5 5.5 v13', 'M15.5 5.5 v13'],
  reset: ['M5 12 a7 7 0 1 0 2.5 -5.4', 'M4.5 4 v3.2 h3.2'],
  locked: ['M6.5 11 h11 v8.5 h-11 Z', 'M9 11 V8 a3 3 0 0 1 6 0 v3'],
  passed: ['M5 13 l4.5 4.5 L19.5 7'],
  failed: ['M6.5 6.5 l11 11', 'M17.5 6.5 l-11 11'],
  hint: ['M12 3.5 a5.5 5.5 0 0 0 -3 10.1 V16 h6 v-2.4 A5.5 5.5 0 0 0 12 3.5 Z', 'M10 19 h4'],
  waypoint: ['M12 5 a7 7 0 1 0 0.01 0 Z'],
  chart: ['M4 19 l5 -5 l4 2 l7 -9', 'M4 4 v16 h16'],
  back: ['M14.5 5.5 L8 12 l6.5 6.5'],
  next: ['M9.5 5.5 L16 12 l-6.5 6.5'],
  export: ['M12 15.5 V4.5', 'M8 8.5 L12 4.5 l4 4', 'M5 15 v4.5 h14 V15'],
  import: ['M12 4.5 V15.5', 'M8 11.5 L12 15.5 l4 -4', 'M5 15 v4.5 h14 V15'],
  mentor: ['M6 4.5 h12 v15 h-12 Z', 'M9 9 h6', 'M9 12.5 h6', 'M9 16 h3'],
  bigtype: ['M3.5 18 L8 6 l4.5 12', 'M5.2 14 h5.6', 'M15 18 v-7 a3 3 0 0 1 5.5 1.7 V18'],
  contrast: ['M12 4 a8 8 0 1 0 0.01 0 Z', 'M12 4 v16 a8 8 0 0 0 0 -16 Z'],
  code: ['M8.5 7 L3.5 12 l5 5', 'M15.5 7 L20.5 12 l-5 5', 'M13.5 5 L10.5 19'],
  lessons: ['M5 7 h14', 'M5 12 h14', 'M5 17 h9'],
  robot: ['M6 9.5 h12 v8 h-12 Z', 'M9 13 h0.01', 'M15 13 h0.01', 'M12 6.5 V9.5', 'M4 12 v3', 'M20 12 v3'],
};

export type IconName = keyof typeof PATHS | string;

export function icon(name: IconName, size = 24): SVGElement {
  const paths = PATHS[name] ?? PATHS['waypoint']!;
  return svg(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: size,
      height: size,
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 1.75,
      'stroke-linecap': 'square',
      'stroke-linejoin': 'miter',
      'aria-hidden': 'true',
      focusable: 'false',
      class: 'icon',
    },
    ...paths.map((d) => svg('path', { d, ...(name === 'run' || name === 'stop' ? { fill: 'currentColor' } : {}) })),
  );
}

export const ICON_NAMES = Object.keys(PATHS);
