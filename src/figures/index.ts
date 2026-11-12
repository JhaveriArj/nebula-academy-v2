import './figures.css';

/* Interactive figures a lesson can embed. A line `:::figure <id>` in lesson Markdown becomes an
   empty slot (src/ui/markdown.ts); mountFigures fills each slot from src/figures/<id>.figure.ts,
   loaded only when a page has that slot. Every figure is drawn from code in this bundle, so it
   works offline, and is operated with buttons and drags, never hover alone (CLAUDE.md). */

export interface FigureModule {
  /** Draws the figure into host and starts it; returns a function that stops it for good. */
  mount(host: HTMLElement): () => void;
}

const modules = import.meta.glob<FigureModule>('./*.figure.ts');
const idOf = (path: string) => path.slice(2, -'.figure.ts'.length);
const byId = new Map(Object.entries(modules).map(([path, load]) => [idOf(path), load]));

export const figureIds = (): string[] => [...byId.keys()].sort();

/** Fills every figure slot under root. The returned function stops them all. */
export function mountFigures(root: ParentNode): () => void {
  const stops: (() => void)[] = [];
  let left = false;
  for (const slot of root.querySelectorAll<HTMLElement>('.figure-slot[data-figure]')) {
    const load = byId.get(slot.dataset.figure!);
    if (!load) {
      slot.textContent = `The figure "${slot.dataset.figure}" is missing.`;
      continue;
    }
    load()
      .then((figure) => { if (!left) stops.push(figure.mount(slot)); })
      .catch(() => { slot.textContent = 'This figure could not be loaded. Reload to try again.'; });
  }
  return () => { left = true; for (const stop of stops) stop(); };
}
