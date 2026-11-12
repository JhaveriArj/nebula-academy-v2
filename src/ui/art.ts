/* The swap-in rule for art (docs/ART_PIPELINE.md).

   Every picture in public/art has a hand-drawn <name>.svg. A Blender render of it is
   <name>.webp (and <name>@2x.webp for sharp screens) in the same folder. Code asks for a
   picture by name only; this file picks the render when the build found one and the SVG
   otherwise, and drops back to the SVG if the render fails to load. Adding or removing a
   render is a file change, never a code change. */

declare const __ART_RENDERS__: string[];

const BASE = `${import.meta.env.BASE_URL}art/`;
const RENDERS = new Set(__ART_RENDERS__);

/** An image of public/art/<name>. `img.dataset.art` is "render" or "svg", whichever is showing. */
export function artImage(name: string, onLoad?: (img: HTMLImageElement) => void): HTMLImageElement {
  const img = new Image();
  img.decoding = 'async';
  const svg = () => {
    img.dataset.art = 'svg';
    img.src = `${BASE}${name}.svg`;
  };
  img.onerror = () => {
    if (img.dataset.art === 'render') svg();
  };
  if (onLoad) img.onload = () => onLoad(img);
  if (RENDERS.has(name)) {
    img.dataset.art = 'render';
    img.src = `${BASE}${name}${(globalThis.devicePixelRatio || 1) > 1 ? '@2x' : ''}.webp`;
  } else {
    svg();
  }
  return img;
}
