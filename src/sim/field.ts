/* The virtual field: 12 ft x 12 ft of foam tiles, four walls, and generic game
   elements. No season-specific names or shapes, so this never dates. */

export const FIELD_CM = 365.76; // 12 ft
export const TILE_CM = 60.96; // 24 in foam tile
export const TILES = 6;
export const ROBOT_CM = 45.72; // 18 in square footprint
export const ROBOT_HALF = ROBOT_CM / 2;

export type TileColor = 'grey' | 'red' | 'blue' | 'yellow';

export const TILE_RGB: Record<TileColor, { r: number; g: number; b: number }> = {
  grey: { r: 96, g: 100, b: 94 },
  red: { r: 193, g: 48, b: 26 },
  blue: { r: 30, g: 72, b: 168 },
  yellow: { r: 224, g: 170, b: 48 },
};

/** Tiles that are not grey, keyed "col,row" with (0,0) at the bottom-left. */
const PAINTED: Record<string, TileColor> = {
  '0,5': 'blue', // the Tier 4 checkpoint parks here
  '5,5': 'red',
  '5,0': 'yellow',
};

export function tileColorAt(x: number, y: number): TileColor {
  const col = Math.floor(x / TILE_CM);
  const row = Math.floor(y / TILE_CM);
  if (col < 0 || row < 0 || col >= TILES || row >= TILES) return 'grey';
  return PAINTED[`${col},${row}`] ?? 'grey';
}

export type ElementKind = 'cube' | 'ball';

export interface FieldElement {
  kind: ElementKind;
  x: number;
  y: number;
  /** Collision radius in cm. */
  r: number;
}

/** Six generic elements, placed clear of the Tier 4 checkpoint path on purpose. */
export function startingElements(): FieldElement[] {
  return [
    { kind: 'cube', x: 121.92, y: 121.92, r: 6 },
    { kind: 'cube', x: 243.84, y: 121.92, r: 6 },
    { kind: 'cube', x: 121.92, y: 243.84, r: 6 },
    { kind: 'cube', x: 243.84, y: 243.84, r: 6 },
    { kind: 'ball', x: 91.44, y: 182.88, r: 7 },
    { kind: 'ball', x: 274.32, y: 182.88, r: 7 },
  ];
}

/** Default start pose: bottom-centre tile, facing into the field. */
export const DEFAULT_START = { x: FIELD_CM / 2, y: TILE_CM / 2, headingDeg: 0 };
