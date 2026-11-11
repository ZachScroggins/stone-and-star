import { BufferGeometry, Float32BufferAttribute } from 'three';

export const PYRAMID_GENERATOR_VERSION = 1;

export interface PyramidParams {
  /** Side length of the square base, metres. */
  baseSide: number;
  /** Apex height of the complete (as-built) pyramid, metres. */
  height: number;
  /**
   * Height this model stops at. Equal to `height` for a complete pyramid; lower
   * for a surviving one that has lost its top, which ends in a flat platform.
   */
  topHeight?: number;
  /** Smooth casing faces (as built) or exposed stepped core (surviving). */
  casing: boolean;
  /**
   * Visual step height for the stepped core. Schematic: not a sourced course count.
   */
  stepHeight?: number;
  /** Seed for per-course colour variation. */
  seed?: number;
}

// Matte limestone tones (sRGB). Casing reads paler and more even than the weathered core.
const CASING = [0.86, 0.8, 0.68];
const CORE = [0.74, 0.64, 0.5];

/** glTF vertex colours are linear; convert from sRGB before storing. */
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

/**
 * Pyramid geometry in local metres: base centred on the origin at y = 0, sides
 * facing the cardinal directions (−z is north). Flat-shaded, with vertex colours.
 */
export function buildPyramid(p: PyramidParams): BufferGeometry {
  const top = Math.min(p.topHeight ?? p.height, p.height);
  const halfAt = (y: number) => (p.baseSide / 2) * (1 - y / p.height);
  const positions: number[] = [];
  const colors: number[] = [];
  const random = rng(p.seed ?? 1);

  const quad = (a: number[], b: number[], c: number[], d: number[], col: number[]) => {
    positions.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (let i = 0; i < 6; i++) colors.push(...col);
  };
  const tri = (a: number[], b: number[], c: number[], col: number[]) => {
    positions.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) colors.push(...col);
  };
  const tint = (base: number[], amount: number) => {
    const k = 1 + (random() - 0.5) * amount;
    return base.map((v) => Math.min(1, v * k));
  };

  // Corners of a square at height y with half-width h, counter-clockwise from above,
  // starting north-west: NW, NE, SE, SW (−z north, +x east).
  const ring = (y: number, h: number) => [
    [-h, y, -h],
    [h, y, -h],
    [h, y, h],
    [-h, y, h],
  ];

  if (p.casing) {
    const b = ring(0, p.baseSide / 2);
    if (top >= p.height) {
      const apex = [0, p.height, 0];
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        tri(b[j], b[i], apex, tint(CASING, 0.04));
      }
    } else {
      const t = ring(top, halfAt(top));
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        quad(b[j], b[i], t[i], t[j], tint(CASING, 0.04));
      }
      quad(t[0], t[3], t[2], t[1], CASING);
    }
  } else {
    const step = p.stepHeight ?? 1.5;
    const count = Math.max(1, Math.round(top / step));
    const dy = top / count;
    for (let k = 0; k < count; k++) {
      const y0 = k * dy;
      const y1 = (k + 1) * dy;
      // A course's riser sits at the half-width of its top edge; the tread steps in
      // to the next course. This keeps the stepped silhouette inside the casing line.
      const h = halfAt(y1);
      const lower = ring(y0, h);
      const upper = ring(y1, h);
      const col = tint(CORE, 0.12);
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        quad(lower[j], lower[i], upper[i], upper[j], col);
      }
      const hNext = k + 1 < count ? halfAt(y1 + dy) : 0;
      const inner = ring(y1, hNext);
      if (k + 1 < count) {
        // Tread: a frame between this course's top edge and the next riser.
        for (let i = 0; i < 4; i++) {
          const j = (i + 1) % 4;
          quad(upper[j], upper[i], inner[i], inner[j], tint(col, 0.05));
        }
      } else {
        quad(upper[0], upper[3], upper[2], upper[1], col);
      }
    }
  }

  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new Float32BufferAttribute(colors.map(toLinear), 3));
  g.computeVertexNormals();
  return g;
}
