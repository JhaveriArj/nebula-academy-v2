import { el, mount } from '../dom';
import type { SimSnapshot } from '../../sim/simulation';

/* The telemetry panel, styled like the Driver Station readout: a key on the left, a value
   on the right, replaced rather than scrolled, because that is how the real one behaves
   at fifty updates a second. */

export interface TelemetryPanel {
  element: HTMLElement;
  update(snapshot: SimSnapshot | null): void;
}

export function createTelemetryPanel(): TelemetryPanel {
  const list = el('dl', { class: 'telemetry-list' });
  // A <dl> may only hold dt/dd groups, so the empty message sits beside it, not in it.
  const empty = el('p', { class: 'telemetry-empty', text: 'Nothing sent yet. Telemetry appears when your code calls update().' });
  const robot = el('div', { class: 'telemetry-robot' });
  const element = el('div', { class: 'telemetry on-dark' },
    el('div', { class: 'telemetry-head' },
      el('span', { class: 'telemetry-title display', text: 'Telemetry' }),
    ),
    empty,
    list,
    el('div', { class: 'telemetry-divider' }),
    robot,
  );

  return {
    element,
    update(snapshot) {
      if (!snapshot) {
        mount(list);
        empty.hidden = false;
        mount(robot);
        return;
      }

      empty.hidden = snapshot.telemetry.length > 0;
      if (snapshot.telemetry.length === 0) {
        mount(list);
      } else {
        mount(list,
          ...snapshot.telemetry.flatMap((line) =>
            line.key
              ? [el('dt', { text: line.key }), el('dd', { text: line.value })]
              : [el('dt', { class: 'telemetry-bare', text: line.value }), el('dd', {})],
          ),
        );
      }

      // The robot's own state, which the kid did not have to print.
      const rows: [string, string][] = [
        ['heading', `${snapshot.pose.headingDeg.toFixed(1)}°`],
        ['travelled', `${snapshot.distanceTravelledCm.toFixed(0)} cm`],
        ['ahead', snapshot.distanceCm >= 200 ? 'over 200 cm' : `${snapshot.distanceCm.toFixed(0)} cm`],
        ['tile', snapshot.tile],
        ['clock', `${(snapshot.timeMs / 1000).toFixed(1)} s`],
      ];
      mount(robot,
        el('p', { class: 'telemetry-sub display', text: 'Robot' }),
        el('dl', { class: 'telemetry-list telemetry-list-muted' },
          ...rows.flatMap(([key, value]) => [el('dt', { text: key }), el('dd', { text: value })]),
        ),
        el('p', { class: 'telemetry-sub display', text: 'Motors' }),
        el('dl', { class: 'telemetry-list telemetry-list-muted' },
          ...Object.entries(snapshot.motors).flatMap(([name, motor]) => [
            el('dt', { text: name }),
            el('dd', { text: `${motor.power.toFixed(2)}  ${motor.ticks} ticks${motor.reversed ? ', reversed' : ''}` }),
          ]),
        ),
      );
    },
  };
}
