import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { fromBce } from '@/lib/years';

import {
  countFittingCombinations,
  culminationAltitudeDeg,
  errorDeg,
  evaluateAlignment,
  horizonAzimuthDeg,
  nightCulmination,
  starOfDate,
  type AlignmentSpec,
} from './alignment';
import { StarCatalogV1 } from './catalog';
import { raDecFromVec } from './coords';
import { solveSky } from './sky';

const DEG = Math.PI / 180;
const catalog = StarCatalogV1.parse(
  JSON.parse(readFileSync(join(import.meta.dirname, '../../public/data/stars-hip-v1.json'), 'utf8'))
);
const star = (hip: number) => catalog.stars.find((r) => r[0] === hip)!;
const GIZA_LAT = 29.9792;
const GIZA_LON = 31.1342;

describe('culminationAltitudeDeg', () => {
  it('follows 90° − |φ − δ| on the matching side of the meridian', () => {
    expect(culminationAltitudeDeg(30, 30, 'south', false)).toBe(90);
    expect(culminationAltitudeDeg(-15, 30, 'south', false)).toBe(45);
    expect(culminationAltitudeDeg(80, 30, 'north', false)).toBe(40);
  });

  it('returns null on the wrong side or below the horizon', () => {
    expect(culminationAltitudeDeg(-15, 30, 'north', false)).toBeNull();
    expect(culminationAltitudeDeg(80, 30, 'south', false)).toBeNull();
    expect(culminationAltitudeDeg(-70, 30, 'south', false)).toBeNull();
  });

  it('adds refraction (about 1′ at 45°)', () => {
    const r = culminationAltitudeDeg(-15, 30, 'south', true)! - 45;
    expect(r * 60).toBeGreaterThan(0.9);
    expect(r * 60).toBeLessThan(1.1);
  });
});

describe('horizonAzimuthDeg', () => {
  it('puts a celestial-equator star due east and west', () => {
    expect(horizonAzimuthDeg(0, 30, 0, 'rising', false)).toBeCloseTo(90, 9);
    expect(horizonAzimuthDeg(0, 30, 0, 'setting', false)).toBeCloseTo(270, 9);
  });

  it('matches the textbook rising azimuth for δ = 23.44° at φ = 30°', () => {
    // cos A = sin δ / cos φ → A ≈ 62.65°
    expect(horizonAzimuthDeg(23.44, 30, 0, 'rising', false)).toBeCloseTo(62.65, 1);
  });

  it('returns null for stars that never rise or never set', () => {
    expect(horizonAzimuthDeg(-70, 30, 0, 'rising', false)).toBeNull();
    expect(horizonAzimuthDeg(80, 30, 0, 'rising', false)).toBeNull();
  });

  it('moves a rising star south when the horizon is higher (its path tilts south as it climbs)', () => {
    const flat = horizonAzimuthDeg(10, 30, 0, 'rising', false)!;
    const hills = horizonAzimuthDeg(10, 30, 1, 'rising', false)!;
    expect(hills).toBeGreaterThan(flat);
  });
});

describe('errorDeg', () => {
  it('wraps azimuth differences across north', () => {
    expect(errorDeg('rising', 359, 1)).toBeCloseTo(-2);
    expect(errorDeg('culmination', 46, 45)).toBe(1);
  });
});

describe('starOfDate', () => {
  it('brings Thuban within 0.3° of the pole around 2830 BCE', () => {
    const dec = starOfDate(star(68756), fromBce(2830)).dec / DEG;
    expect(dec).toBeGreaterThan(89.7);
  });
});

describe('evaluateAlignment', () => {
  const alnitak: AlignmentSpec = {
    kind: 'culmination',
    meridian: 'south',
    axisDeg: 45,
    axisUncertaintyDeg: 0.5,
    epochStart: fromBce(2589),
    epochEnd: fromBce(2566),
  };

  it('finds the years when Alnitak culminates at 45° over Giza', () => {
    const r = evaluateAlignment(
      alnitak,
      star(26727),
      GIZA_LAT,
      { axisDeg: 45, toleranceDeg: 0.5, horizonDeg: 0, refraction: true },
      { from: fromBce(4500), to: fromBce(500), step: 10 }
    );
    expect(r.fits).toHaveLength(1);
    expect(r.best!.year).toBeGreaterThan(fromBce(2600));
    expect(r.best!.year).toBeLessThan(fromBce(2400));
    expect(r.fitsClaimedRange).toBe(true);
  });

  it('counts assumption sets, and a tighter tolerance fits fewer of them', () => {
    const loose = countFittingCombinations(alnitak, star(26727), GIZA_LAT, 1);
    const tight = countFittingCombinations(alnitak, star(26727), GIZA_LAT, 0.1);
    expect(loose.total).toBe(6);
    expect(loose.fit).toBeGreaterThan(tight.fit);
  });

  it('tries three horizon heights for rising alignments', () => {
    const spec: AlignmentSpec = { ...alnitak, kind: 'rising', meridian: undefined, axisDeg: 105 };
    expect(countFittingCombinations(spec, star(26727), GIZA_LAT, 1).total).toBe(18);
  });
});

describe('nightCulmination', () => {
  it('finds the night Alnitak crosses the meridian at midnight: the Sun is opposite it', () => {
    const year = fromBce(2500);
    const { ra } = starOfDate(star(26727), year);
    const { dayOfYear, solarHour } = nightCulmination(year, ra, GIZA_LAT, GIZA_LON);
    expect(Math.min(solarHour, 24 - solarHour)).toBeLessThan(0.5);
    const sun = solveSky({ year, dayOfYear, solarHour: 12, latDeg: GIZA_LAT, lonDeg: GIZA_LON });
    const opposite = Math.abs((((raDecFromVec(sun.sun.vec).ra - ra) / DEG + 360) % 360) - 180);
    expect(opposite).toBeLessThan(2);
  });
});
