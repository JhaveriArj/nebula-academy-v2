import { FIELD_CM, ROBOT_CM, TILE_CM, TILES, TILE_RGB, tileColorAt } from '../../sim/field';
import type { SimSnapshot } from '../../sim/simulation';

/* The field view: a top-down canvas of the 12 ft field with the robot on it.

   One of the dark "space" surfaces in docs/DESIGN.md, so this is where --star is
   allowed to glow. Everything is drawn from a SimSnapshot, which means the same renderer
   serves the home page hero, the Watch step and a live run.

   Canvas cannot read var(--token), so the colors are read from theme.css once per view
   (and again on resize). theme.css stays the only place a color is written down. */

interface FieldPalette {
  ground: string; seam: string; wall: string; line: string; chassis: string;
  wheel: string; star: string; go: string;
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
  };
}

export interface FieldView {
  canvas: HTMLCanvasElement;
  draw(snapshot: SimSnapshot | null): void;
  /** Call on resize, or when the container changes size. */
  resize(): void;
  destroy(): void;
}

export function createFieldView(options: { label?: string } = {}): FieldView {
  const canvas = document.createElement('canvas');
  canvas.className = 'field-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', options.label ?? 'The virtual field, seen from above');

  let last: SimSnapshot | null = null;
  let side = 0;
  let colors = readPalette();

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

    // Tiles.
    ctx.fillStyle = colors.ground;
    ctx.fillRect(0, 0, side, side);
    for (let col = 0; col < TILES; col++) {
      for (let row = 0; row < TILES; row++) {
        const colour = tileColorAt(col * TILE_CM + 1, row * TILE_CM + 1);
        if (colour === 'grey') continue;
        const rgb = TILE_RGB[colour];
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
        ctx.fillRect(px(col * TILE_CM), py((row + 1) * TILE_CM), px(TILE_CM), px(TILE_CM));
      }
    }

    // Seams, one hairline, no shadow.
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

    // Walls.
    ctx.strokeStyle = colors.wall;
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, side - 3, side - 3);

    if (!snapshot) return;

    // The route already driven.
    if (snapshot.trail.length > 1) {
      ctx.strokeStyle = colors.star;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px(snapshot.trail[0]!.x), py(snapshot.trail[0]!.y));
      for (const point of snapshot.trail.slice(1)) ctx.lineTo(px(point.x), py(point.y));
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Game elements.
    for (const element of snapshot.elements) {
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

    drawRobot(ctx, snapshot, px, py, scale, colors);
  }

  resize();
  const onResize = () => resize();
  addEventListener('resize', onResize);

  return {
    canvas,
    draw,
    resize,
    destroy: () => removeEventListener('resize', onResize),
  };
}

function drawRobot(
  ctx: CanvasRenderingContext2D,
  snapshot: SimSnapshot,
  px: (cm: number) => number,
  py: (cm: number) => number,
  scale: number,
  colors: FieldPalette,
): void {
  const { x, y, headingDeg } = snapshot.pose;
  const size = ROBOT_CM * scale;

  ctx.save();
  ctx.translate(px(x), py(y));
  // Field heading is counter-clockwise from +y; canvas rotation is clockwise from +x.
  ctx.rotate(-(headingDeg * Math.PI) / 180);

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

  // The claw, open or closed.
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
