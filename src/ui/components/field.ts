import { FIELD_CM, ROBOT_CM, TILE_CM, TILES, TILE_RGB, tileColorAt } from '../../sim/field';
import type { SimSnapshot } from '../../sim/simulation';

/* The field view: a top-down canvas of the 12 ft field with the robot on it.

   One of the dark "space" surfaces in docs/DESIGN.md, so this is where --star is
   allowed to glow. Everything is drawn from a SimSnapshot, which means the same renderer
   serves the home page hero, the Watch step and a live run.

   Canvas cannot read var(--token), so the colors are read from theme.css once per view
   (and again on resize). theme.css stays the only place a color is written down. */

/* The reference art in public/art, drawn onto the canvas once loaded. Until an image has
   arrived (or if it never does), the field falls back to the shapes drawn below, so the
   first frame is never blank. */
const BASE = import.meta.env.BASE_URL;
const SPRITE_FILES = {
  tank: 'robot-tank.svg',
  mecanum: 'robot-mecanum.svg',
  tile: 'field-tile.svg',
  cube: 'element-cube.svg',
  ball: 'element-ball.svg',
} as const;
type SpriteName = keyof typeof SPRITE_FILES;
const repaintOnLoad = new Set<() => void>();
let sprites: Record<SpriteName, HTMLImageElement> | null = null;

function loadSprites(): Record<SpriteName, HTMLImageElement> {
  if (sprites) return sprites;
  const out = {} as Record<SpriteName, HTMLImageElement>;
  for (const [name, file] of Object.entries(SPRITE_FILES) as [SpriteName, string][]) {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => repaintOnLoad.forEach((repaint) => repaint());
    img.src = `${BASE}art/${file}`;
    out[name] = img;
  }
  sprites = out;
  return out;
}

const ready = (img: HTMLImageElement | undefined): img is HTMLImageElement =>
  !!img && img.complete && img.naturalWidth > 0;

interface FieldPalette {
  ground: string; seam: string; wall: string; line: string; chassis: string;
  wheel: string; star: string; go: string; electric: string;
}

function readPalette(): FieldPalette {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    ground: v('--space'),
    seam: v('--space-line'),
    wall: v('--space-wall'),
    line: v('--space-ink'),
    chassis: v('--space-raised'),
    wheel: v('--space-mute'),
    star: v('--star'),
    go: v('--space-go'),
    electric: v('--electric-glow'),
  };
}

export interface FieldView {
  canvas: HTMLCanvasElement;
  draw(snapshot: SimSnapshot | null): void;
  /** Call on resize, or when the container changes size. */
  resize(): void;
  destroy(): void;
}

export function createFieldView(options: { label?: string; glow?: boolean } = {}): FieldView {
  /** The home page's showpiece screen: the route and the robot glow, and elements pulse. */
  const glow = options.glow === true;
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.className = 'field-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', options.label ?? 'The virtual field, seen from above');

  let last: SimSnapshot | null = null;
  let side = 0;
  let colors = readPalette();
  const art = loadSprites();

  const resize = (): void => {
    const box = canvas.parentElement;
    const available = box ? Math.min(box.clientWidth, box.clientHeight || box.clientWidth) : 320;
    side = Math.max(160, Math.floor(available));
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    canvas.width = Math.floor(side * dpr);
    canvas.height = Math.floor(side * dpr);
    canvas.style.width = `${side}px`;
    canvas.style.height = `${side}px`;
    colors = readPalette();
    draw(last);
  };

  function draw(snapshot: SimSnapshot | null): void {
    last = snapshot;
    const ctx = canvas.getContext('2d');
    if (!ctx || side === 0) return;
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, side, side);

    const scale = side / FIELD_CM;
    /** Field centimetres to canvas pixels. The field's y runs up; the canvas's runs down. */
    const px = (cm: number) => cm * scale;
    const py = (cm: number) => side - cm * scale;

    // Tiles: the foam-tile art where it has loaded, then the painted alliance tiles over it.
    ctx.fillStyle = colors.ground;
    ctx.fillRect(0, 0, side, side);
    if (ready(art.tile)) {
      for (let col = 0; col < TILES; col++) {
        for (let row = 0; row < TILES; row++) {
          ctx.drawImage(art.tile, px(col * TILE_CM), py((row + 1) * TILE_CM), px(TILE_CM), px(TILE_CM));
        }
      }
    }
    for (let col = 0; col < TILES; col++) {
      for (let row = 0; row < TILES; row++) {
        const colour = tileColorAt(col * TILE_CM + 1, row * TILE_CM + 1);
        if (colour === 'grey') continue;
        const rgb = TILE_RGB[colour];
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
        ctx.fillRect(px(col * TILE_CM), py((row + 1) * TILE_CM), px(TILE_CM), px(TILE_CM));
      }
    }

    // Seams, one hairline. On the glowing screen they are softer, a grid you feel more than see.
    ctx.globalAlpha = glow ? 0.55 : 1;
    ctx.strokeStyle = colors.seam;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < TILES; i++) {
      ctx.moveTo(Math.round(px(i * TILE_CM)) + 0.5, 0);
      ctx.lineTo(Math.round(px(i * TILE_CM)) + 0.5, side);
      ctx.moveTo(0, Math.round(py(i * TILE_CM)) + 0.5);
      ctx.lineTo(side, Math.round(py(i * TILE_CM)) + 0.5);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Walls.
    ctx.strokeStyle = colors.wall;
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, side - 3, side - 3);

    if (!snapshot) return;

    // The route already driven.
    if (snapshot.trail.length > 1) {
      ctx.strokeStyle = colors.star;
      ctx.globalAlpha = glow ? 0.85 : 0.45;
      ctx.lineWidth = glow ? 2.5 : 2;
      if (glow) {
        ctx.shadowColor = colors.star;
        ctx.shadowBlur = 10;
      }
      ctx.beginPath();
      ctx.moveTo(px(snapshot.trail[0]!.x), py(snapshot.trail[0]!.y));
      for (const point of snapshot.trail.slice(1)) ctx.lineTo(px(point.x), py(point.y));
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    // Game elements. On the glowing screen each one breathes a soft halo.
    if (glow) {
      const t = calm.matches ? 0 : performance.now() / 900;
      ctx.strokeStyle = colors.electric;
      ctx.lineWidth = 1.5;
      snapshot.elements.forEach((element, i) => {
        const pulse = 0.5 + 0.5 * Math.sin(t + i * 1.7);
        ctx.globalAlpha = 0.25 + 0.35 * pulse;
        ctx.beginPath();
        ctx.arc(px(element.x), py(element.y), px(element.r) * (1.5 + 0.35 * pulse), 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }
    for (const element of snapshot.elements) {
      const sprite = element.kind === 'ball' ? art.ball : art.cube;
      if (ready(sprite)) {
        const s = element.kind === 'ball' ? px(element.r * 2) : px(element.r * 1.9);
        ctx.drawImage(sprite, px(element.x) - s / 2, py(element.y) - s / 2, s, s);
        continue;
      }
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 1.5;
      if (element.kind === 'ball') {
        ctx.beginPath();
        ctx.arc(px(element.x), py(element.y), px(element.r), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        const s = px(element.r * 1.7);
        ctx.strokeRect(px(element.x) - s / 2, py(element.y) - s / 2, s, s);
      }
    }

    if (glow) {
      ctx.shadowColor = colors.electric;
      ctx.shadowBlur = 18;
    }
    drawRobot(ctx, snapshot, px, py, scale, colors, snapshot.kind === 'tank' ? art.tank : art.mecanum);
    ctx.shadowBlur = 0;
  }

  resize();
  const repaint = () => draw(last);
  repaintOnLoad.add(repaint);
  const onResize = () => resize();
  addEventListener('resize', onResize);
  // Light/dark changed, from the Display panel or (on Auto) from the device itself.
  const recolor = () => {
    colors = readPalette();
    draw(last);
  };
  addEventListener('nebula:appearance', recolor);
  const scheme = matchMedia('(prefers-color-scheme: dark)');
  scheme.addEventListener('change', recolor);

  return {
    canvas,
    draw,
    resize,
    destroy: () => {
      repaintOnLoad.delete(repaint);
      removeEventListener('resize', onResize);
      removeEventListener('nebula:appearance', recolor);
      scheme.removeEventListener('change', recolor);
    },
  };
}

function drawRobot(
  ctx: CanvasRenderingContext2D,
  snapshot: SimSnapshot,
  px: (cm: number) => number,
  py: (cm: number) => number,
  scale: number,
  colors: FieldPalette,
  sprite: HTMLImageElement | undefined,
): void {
  const { x, y, headingDeg } = snapshot.pose;
  const size = ROBOT_CM * scale;

  ctx.save();
  ctx.translate(px(x), py(y));
  // Field heading is counter-clockwise from +y; canvas rotation is clockwise from +x.
  ctx.rotate(-(headingDeg * Math.PI) / 180);

  if (ready(sprite)) {
    // The sprite's 100x100 box is the robot's 18 in footprint; forward is up, as here.
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
  } else {
    // Chassis.
    ctx.fillStyle = colors.chassis;
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(-size / 2, -size / 2, size, size);
    ctx.fill();
    ctx.stroke();

    // Wheels. The tank robot has two, centred on its long sides; the mecanum robot has
    // four at the corners, with the roller drawn at 45 degrees so rotation reads at a glance.
    const wheelW = size * 0.2;
    const wheelH = size * 0.3;
    const wheels: [number, number][] =
      snapshot.kind === 'tank'
        ? [
            [-size / 2, -wheelH / 2],
            [size / 2 - wheelW, -wheelH / 2],
          ]
        : [
            [-size / 2, -size / 2],
            [size / 2 - wheelW, -size / 2],
            [-size / 2, size / 2 - wheelH],
            [size / 2 - wheelW, size / 2 - wheelH],
          ];
    ctx.strokeStyle = colors.wheel;
    ctx.lineWidth = 1.5;
    for (const [wx, wy] of wheels) {
      ctx.strokeRect(wx, wy, wheelW, wheelH);
      if (snapshot.kind === 'mecanum') {
        ctx.beginPath();
        ctx.moveTo(wx, wy + wheelH);
        ctx.lineTo(wx + wheelW, wy);
        ctx.stroke();
      }
    }

    // Forward marker, lit like the antennae because this surface is dark.
    ctx.strokeStyle = colors.star;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.12);
    ctx.lineTo(0, -size / 2 - size * 0.14);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -size / 2 - size * 0.2, Math.max(2, size * 0.055), 0, Math.PI * 2);
    ctx.fillStyle = colors.star;
    ctx.fill();

  }

  // The claw, open or closed. Drawn live on top of either robot, because it moves.
  const claw = snapshot.servos['clawServo'] ?? 0;
  ctx.strokeStyle = claw > 0.5 ? colors.go : colors.wheel;
  ctx.lineWidth = 2;
  const spread = size * (0.22 - claw * 0.14);
  ctx.beginPath();
  ctx.moveTo(-spread, size / 2);
  ctx.lineTo(-spread, size / 2 + size * 0.12);
  ctx.moveTo(spread, size / 2);
  ctx.lineTo(spread, size / 2 + size * 0.12);
  ctx.stroke();

  ctx.restore();
}
