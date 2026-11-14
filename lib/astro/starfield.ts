import { ofDate, properMotion, refraction, toHorizontal, type Horizontal } from './coords';
import type { SkyFrame } from './sky';

/** Scene direction (unit vector, three.js axes: +x east, +y up, −z north) for alt/az. */
export function sceneDirection({ alt, az }: Horizontal): [number, number, number] {
  const ca = Math.cos(alt);
  return [ca * Math.sin(az), Math.sin(alt), -ca * Math.cos(az)];
}

/**
 * Apparent directions for every catalog star: proper motion to the epoch, long-term
 * precession to the mean equator of date, horizon coordinates, then refraction.
 * Rows follow STAR_CATALOG_FIELDS. Output is xyz per star, in catalog order.
 */
export function computeStarfield(rows: number[][], frame: SkyFrame): Float32Array {
  const out = new Float32Array(rows.length * 3);
  const years = frame.epj - 2000;
  for (let i = 0; i < rows.length; i++) {
    const [, ra, dec, pmRa, pmDec] = rows[i];
    const j2000 = properMotion(ra, dec, pmRa, pmDec, years);
    const h = toHorizontal(ofDate(frame.precession, j2000), frame.lst, frame.lat);
    const d = sceneDirection({ alt: h.alt + refraction(h.alt), az: h.az });
    out[i * 3] = d[0];
    out[i * 3 + 1] = d[1];
    out[i * 3 + 2] = d[2];
  }
  return out;
}
