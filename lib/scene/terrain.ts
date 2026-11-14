import { z } from 'zod';

/** Square heightmap centred on a site origin. Row 0 is the north edge (z = −half). */
export const TerrainV1 = z.object({
  v: z.literal(1),
  source: z.string(),
  origin: z.object({ lat: z.number(), lon: z.number(), elevationM: z.number() }),
  /** Samples per side. */
  size: z.number().int().min(2),
  spacingM: z.number().positive(),
  /** Metres per stored integer unit. */
  heightScale: z.number().positive(),
  /** Little-endian Int16 heights above mean sea level, row-major, base64. */
  heightsB64: z.string(),
});
export type TerrainV1 = z.infer<typeof TerrainV1>;

export const GIZA_TERRAIN_URL = '/data/giza-terrain-v1.json';

/** Decode heights to metres above the origin's elevation (scene y). */
export function decodeHeights(t: TerrainV1): Float32Array {
  const bin = atob(t.heightsB64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const ints = new Int16Array(bytes.buffer);
  const out = new Float32Array(ints.length);
  for (let i = 0; i < ints.length; i++) out[i] = ints[i] * t.heightScale - t.origin.elevationM;
  return out;
}

/** Bilinear height (scene y) at scene x, z; clamps to the grid edge. */
export function heightAt(t: TerrainV1, heights: Float32Array, x: number, z: number): number {
  const half = ((t.size - 1) * t.spacingM) / 2;
  const fx = Math.min(Math.max((x + half) / t.spacingM, 0), t.size - 1.0001);
  const fz = Math.min(Math.max((z + half) / t.spacingM, 0), t.size - 1.0001);
  const c = Math.floor(fx);
  const r = Math.floor(fz);
  const tx = fx - c;
  const tz = fz - r;
  const at = (rr: number, cc: number) => heights[rr * t.size + cc];
  return (
    at(r, c) * (1 - tx) * (1 - tz) +
    at(r, c + 1) * tx * (1 - tz) +
    at(r + 1, c) * (1 - tx) * tz +
    at(r + 1, c + 1) * tx * tz
  );
}
