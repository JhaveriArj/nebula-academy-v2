import { svg } from './dom';

/* The mascot's head as a vector, for the header lockup. Redrawn from art-source/mascot-4x.png
   (the supplied logo, upscaled 4x and cleaned) in that file's coordinates, so it lines up
   with the character everywhere it appears. Colours come from the --mascot-* tokens in
   theme.css, through classes in app.css, so they stay the art's own in light and dark.

   The viewBox ends at the bottom of the visor: that edge is the head's baseline, and the
   header sets it on the wordmark's baseline. */

export function mascotHead(size = 28): SVGElement {
  return svg('svg', {
    class: 'mascot-head',
    viewBox: '230 200 1000 1060',
    width: String(Math.round((size * 1000) / 1060)),
    height: String(size),
    'aria-hidden': 'true',
    focusable: 'false',
  },
    // Antennae: stalks, then the yellow tips (the same yellow as --star).
    svg('path', { class: 'mh-line-stroke', d: 'M330 300 L430 420 M1150 250 L1010 420' }),
    svg('circle', { class: 'mh-tip', cx: '312', cy: '281', r: '64' }),
    svg('circle', { class: 'mh-tip', cx: '1163', cy: '231', r: '72' }),
    // The helmet: a blue shell behind the visor, with the block on top.
    svg('path', { class: 'mh-helmet', d: 'M262 640 C 262 470, 420 372, 640 360 C 860 352, 1040 470, 1050 640 Z' }),
    svg('path', { class: 'mh-helmet', d: 'M560 372 L590 232 L840 232 L860 360 Z' }),
    // The visor, its lit rim on the left, the face plate, eyes and highlights.
    svg('circle', { class: 'mh-rim', cx: '624', cy: '863', r: '378' }),
    svg('circle', { class: 'mh-visor', cx: '650', cy: '868', r: '342' }),
    svg('ellipse', { class: 'mh-eye', cx: '480', cy: '800', rx: '72', ry: '134' }),
    svg('circle', { class: 'mh-eye', cx: '822', cy: '822', r: '126' }),
    svg('circle', { class: 'mh-shine', cx: '468', cy: '700', r: '38' }),
    svg('circle', { class: 'mh-shine', cx: '775', cy: '727', r: '38' }),
    // The earpiece, in antenna yellow, on the side the character is facing.
    svg('ellipse', { class: 'mh-tip', cx: '1082', cy: '832', rx: '104', ry: '178', transform: 'rotate(-14 1082 832)' }),
  );
}
