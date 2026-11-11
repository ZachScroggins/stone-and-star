import { describe, expect, it } from 'vitest';

import { DEG, ofDate, properMotion, raDecFromVec } from './coords';
import { solveSky } from './sky';
import { jdFromGregorian } from './time';

// Physical consistency checks (not reference data): Stellarium comparisons live in
// stellarium.test.ts.
const GIZA = { latDeg: 29.9792, lonDeg: 31.1342 };
const doy = (y: number, m: number, d: number) =>
  jdFromGregorian(y, m, d) - jdFromGregorian(y, 1, 1) + 1;

describe('solveSky', () => {
  it('puts the Sun on the meridian at solar noon', () => {
    const f = solveSky({ ...GIZA, year: 2026, dayOfYear: doy(2026, 6, 21), solarHour: 12 });
    expect(Math.abs(f.sun.az / DEG - 180)).toBeLessThan(0.2);
    // Noon altitude = 90 − latitude + solar declination (≈ obliquity, 23.44°, at the solstice).
    expect(f.sun.alt / DEG).toBeCloseTo(90 - 29.9792 + 23.44, 0);
  });

  it('has the Sun well below the horizon at solar midnight', () => {
    const f = solveSky({ ...GIZA, year: 2026, dayOfYear: doy(2026, 12, 21), solarHour: 0 });
    expect(f.sun.alt / DEG).toBeLessThan(-50);
  });

  it('puts Polaris near the pole today but far from it in 2560 BCE', () => {
    const polaris = [37.954515, 89.26411, 44.22, -11.74] as const; // HIP 11767, J2000
    const polarDistance = (year: number) => {
      const f = solveSky({ ...GIZA, year, dayOfYear: 1, solarHour: 22 });
      const { dec } = raDecFromVec(ofDate(f.precession, properMotion(...polaris, f.epj - 2000)));
      return 90 - dec / DEG;
    };
    expect(polarDistance(2026)).toBeLessThan(1);
    expect(polarDistance(-2559)).toBeGreaterThan(20);
  });
});
