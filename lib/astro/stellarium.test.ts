import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { AstroTime, Body, GeoVector } from 'astronomy-engine';
import { describe, expect, it } from 'vitest';

import fixture from './__fixtures__/stellarium.json';
import { StarCatalogV1 } from './catalog';
import {
  DEG,
  ofDate,
  properMotion,
  refraction,
  separation,
  toHorizontal,
  vecFromRaDec,
} from './coords';
import { ltpb, type Vec3 } from './erfa';
import { J2000, julianEpoch } from './time';

// Compares lib/astro with Stellarium (see scripts/stellarium-reference.ts for how the
// fixture was recorded and the settings used). Tolerances are in arcminutes.
const ARCMIN = DEG / 60;

const catalog = StarCatalogV1.parse(
  JSON.parse(readFileSync(join(process.cwd(), 'public/data/stars-hip-v1.json'), 'utf8'))
);
const byHip = new Map(catalog.stars.map((r) => [r[0], r]));

type Row = (typeof fixture.rows)[number];

function stellariumVec(row: Row): Vec3 {
  return vecFromRaDec(row.ra * DEG, row.dec * DEG);
}

function ourStar(row: Row): Vec3 {
  const hip = Number(row.object.replace('HIP ', ''));
  const star = byHip.get(hip);
  if (!star) throw new Error(`HIP ${hip} not in catalog`);
  const epj = julianEpoch(row.jd);
  return ofDate(ltpb(epj), properMotion(star[1], star[2], star[3], star[4], epj - 2000));
}

function ourSun(row: Row): Vec3 {
  const time = AstroTime.FromTerrestrialTime(row.jd - J2000);
  const v = GeoVector(Body.Sun, time, false);
  const m = Math.hypot(v.x, v.y, v.z);
  return ofDate(ltpb(julianEpoch(row.jd)), [v.x / m, v.y / m, v.z / m]);
}

const lat = fixture.settings.site.lat * DEG;
const stars = fixture.rows.filter((r) => r.object.startsWith('HIP'));
const sun = fixture.rows.filter((r) => r.object === 'Sun');

/**
 * Binaries whose Hipparcos proper motion is the photocentre's, orbital wobble
 * included. Extrapolated over millennia it drifts from Stellarium's values. Pinned
 * here so the gap is visible and does not grow; fixing it needs sourced system
 * proper motions (and radial velocities), which is data work for a later milestone.
 */
const BINARY_EXCEPTIONS: Record<string, string> = {
  'HIP 32349': 'Sirius',
  'HIP 71683': 'Rigil Kentaurus (α Cen A)',
};

/** Arcminute tolerance by epoch for ordinary stars. */
function starTolerance(label: string) {
  if (label.startsWith('10000 BCE')) return 3; // no radial velocities: perspective acceleration
  if (label.startsWith('2560 BCE')) return 0.5;
  return 0.25;
}

/** Pinned upper bounds for the binaries (arcminutes), from the recorded comparison. */
function binaryBound(label: string) {
  if (label.startsWith('10000 BCE')) return 130;
  if (label.startsWith('2560 BCE')) return 27;
  if (label.startsWith('1000-')) return 4;
  return 0.25;
}

/** Sun: astronomy-engine vs Stellarium's VSOP87; both extrapolate far from J2000. */
function sunTolerance(label: string) {
  if (label.startsWith('10000 BCE')) return 55;
  if (label.startsWith('2560 BCE')) return 8;
  return 0.25;
}

const horizonVec = (alt: number, az: number): Vec3 => [
  Math.cos(alt) * Math.sin(az),
  Math.sin(alt),
  Math.cos(alt) * Math.cos(az),
];

describe(`sky positions vs Stellarium ${fixture.stellarium}`, () => {
  it.each(
    stars.filter((r) => !BINARY_EXCEPTIONS[r.object]).map((r) => [r.object, r.epoch, r] as const)
  )('%s at %s: RA/Dec of date', (_object, epoch, row) => {
    const err = separation(ourStar(row), stellariumVec(row)) / ARCMIN;
    expect(err).toBeLessThan(starTolerance(epoch));
  });

  it.each(
    stars.filter((r) => BINARY_EXCEPTIONS[r.object]).map((r) => [r.object, r.epoch, r] as const)
  )('%s at %s: known binary gap stays within its pinned bound', (_object, epoch, row) => {
    const err = separation(ourStar(row), stellariumVec(row)) / ARCMIN;
    expect(err).toBeLessThan(binaryBound(epoch));
  });

  it('converts equatorial to horizon coordinates exactly as Stellarium does', () => {
    for (const r of stars) {
      // Stellarium's own RA/Dec and sidereal time: isolates the transform.
      const ours = toHorizontal(stellariumVec(r), r['meanSidTm-dd'] * DEG, lat);
      const err = separation(
        horizonVec(ours.alt, ours.az),
        horizonVec(r['altitude-geometric'] * DEG, r['azimuth-geometric'] * DEG)
      );
      expect(err / ARCMIN, `${r.object} at ${r.epoch}`).toBeLessThan(0.02);
    }
  });

  it('matches Stellarium refraction above 5° altitude (1013.25 hPa, 15 °C)', () => {
    const above = stars.filter((r) => r['altitude-geometric'] > 5);
    expect(above.length).toBeGreaterThan(10);
    for (const r of above) {
      const ours = refraction(r['altitude-geometric'] * DEG, 1013.25, 15);
      const theirs = (r.altitude - r['altitude-geometric']) * DEG;
      expect(Math.abs(ours - theirs) / ARCMIN, `${r.object} at ${r.epoch}`).toBeLessThan(0.01);
    }
  });

  it.each(sun.map((r) => [r.epoch, r] as const))('Sun at %s: RA/Dec of date', (epoch, row) => {
    const err = separation(ourSun(row), stellariumVec(row)) / ARCMIN;
    expect(err).toBeLessThan(sunTolerance(epoch));
  });
});
