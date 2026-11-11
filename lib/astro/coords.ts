import { mxv, type Mat3, type Vec3 } from './erfa';

export const DEG = Math.PI / 180;
const MAS = DEG / 3_600_000;

/** Unit vector from right ascension and declination (radians). */
export function vecFromRaDec(ra: number, dec: number): Vec3 {
  const cd = Math.cos(dec);
  return [cd * Math.cos(ra), cd * Math.sin(ra), Math.sin(dec)];
}

/** Right ascension in [0, 2π) and declination, radians. */
export function raDecFromVec(v: Vec3): { ra: number; dec: number } {
  const ra = Math.atan2(v[1], v[0]);
  return {
    ra: ra < 0 ? ra + 2 * Math.PI : ra,
    dec: Math.atan2(v[2], Math.hypot(v[0], v[1])),
  };
}

/**
 * A star's J2000 direction moved by linear proper motion to `years` after J2000.
 * `pmRaCosDec` is μα* (mas/yr, already multiplied by cos δ, as Hipparcos gives it).
 * Linear motion on the tangent plane, without radial velocity: good to well under
 * an arcminute for naked-eye stars over a few millennia except the fastest few.
 */
export function properMotion(
  raDeg: number,
  decDeg: number,
  pmRaCosDec: number,
  pmDec: number,
  years: number
): Vec3 {
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  const p = vecFromRaDec(ra, dec);
  const sa = Math.sin(ra);
  const ca = Math.cos(ra);
  const sd = Math.sin(dec);
  const cd = Math.cos(dec);
  const da = pmRaCosDec * MAS * years;
  const dd = pmDec * MAS * years;
  const v: Vec3 = [p[0] - sa * da - sd * ca * dd, p[1] + ca * da - sd * sa * dd, p[2] + cd * dd];
  const m = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / m, v[1] / m, v[2] / m];
}

export interface Horizontal {
  /** Altitude above the geometric horizon, radians. */
  alt: number;
  /** Azimuth from true north through east, radians in [0, 2π). */
  az: number;
}

/**
 * Equatorial-of-date unit vector to horizontal coordinates.
 * `lst` is local sidereal time (radians), `lat` the observer's latitude.
 */
export function toHorizontal(v: Vec3, lst: number, lat: number): Horizontal {
  const { ra, dec } = raDecFromVec(v);
  const h = lst - ra;
  const sl = Math.sin(lat);
  const cl = Math.cos(lat);
  const sd = Math.sin(dec);
  const cd = Math.cos(dec);
  const ch = Math.cos(h);
  const alt = Math.asin(Math.max(-1, Math.min(1, sl * sd + cl * cd * ch)));
  let az = Math.atan2(-cd * Math.sin(h), sd * cl - cd * sl * ch);
  if (az < 0) az += 2 * Math.PI;
  return { alt, az };
}

/** Rotate a J2000 vector into the mean equator and equinox of date. */
export function ofDate(precession: Mat3, v: Vec3): Vec3 {
  return mxv(precession, v);
}

/**
 * Atmospheric refraction to add to a true (geometric) altitude, radians.
 * Sæmundsson (1986) formula with the usual pressure and temperature factor.
 * Below about −2° there is no meaningful refraction to show, so it tapers to zero.
 */
export function refraction(altTrue: number, pressureHPa = 1010, temperatureC = 10): number {
  const h = altTrue / DEG;
  if (h < -2) return 0;
  const hc = Math.max(h, -1.9);
  const arcmin = 1.02 / Math.tan((hc + 10.3 / (hc + 5.11)) * DEG);
  const factor = (pressureHPa / 1010) * (283 / (273 + temperatureC));
  return (arcmin / 60) * factor * DEG;
}

/** Angular separation between two unit vectors, radians. */
export function separation(a: Vec3, b: Vec3): number {
  const c: Vec3 = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  return Math.atan2(Math.hypot(c[0], c[1], c[2]), a[0] * b[0] + a[1] * b[1] + a[2] * b[2]);
}
