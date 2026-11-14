import type { AlignmentKind } from '@/lib/vocab';

import { DEG, ofDate, properMotion, raDecFromVec, refraction } from './coords';
import { ltpb } from './erfa';
import { solveSky } from './sky';
import { daysInYear, jdFromDayOfYear, julianEpoch } from './time';

// Deterministic alignment tests (planning handoff, section 7: "built-in honesty").
// A structure axis is compared with where a star culminates or rises at an epoch.
// Precession moves those slowly, so a match usually holds for centuries: the
// result is a range of years, and a count of assumption sets that still fit.

/** A catalog row: [hip, raJ2000Deg, decJ2000Deg, pmRaCosDecMasYr, pmDecMasYr, ...]. */
export type StarRow = readonly number[];

export interface AlignmentSpec {
  kind: AlignmentKind;
  meridian?: 'north' | 'south';
  axisDeg: number;
  axisUncertaintyDeg: number;
  epochStart: number;
  epochEnd: number;
}

export interface Assumptions {
  axisDeg: number;
  toleranceDeg: number;
  /** Apparent altitude of the local horizon, degrees (rising and setting only). */
  horizonDeg: number;
  refraction: boolean;
}

/** Right ascension and declination of date (radians) for a year, mid-year. */
export function starOfDate(row: StarRow, year: number): { ra: number; dec: number } {
  const epj = julianEpoch(jdFromDayOfYear(year, 183));
  const [, ra, dec, pmRa, pmDec] = row;
  const j2000 = properMotion(ra, dec, pmRa, pmDec, epj - 2000);
  return raDecFromVec(ofDate(ltpb(epj), j2000));
}

const refractionDeg = (altDeg: number) => refraction(altDeg * DEG) / DEG;

/**
 * Apparent altitude (degrees) of a star at upper culmination on the given side of
 * the meridian, or null if it culminates on the other side or below the horizon.
 */
export function culminationAltitudeDeg(
  decDeg: number,
  latDeg: number,
  side: 'north' | 'south',
  withRefraction: boolean
): number | null {
  const south = decDeg <= latDeg;
  if (south !== (side === 'south')) return null;
  const alt = 90 - Math.abs(latDeg - decDeg);
  if (alt <= 0) return null;
  return withRefraction ? alt + refractionDeg(alt) : alt;
}

/**
 * Azimuth (degrees from true north) where a star rises or sets over a horizon at
 * `horizonDeg` apparent altitude, or null if it never crosses that altitude.
 */
export function horizonAzimuthDeg(
  decDeg: number,
  latDeg: number,
  horizonDeg: number,
  event: 'rising' | 'setting',
  withRefraction: boolean
): number | null {
  // The star appears at the horizon when its geometric altitude is lower by the refraction.
  const h = (horizonDeg - (withRefraction ? refractionDeg(horizonDeg) : 0)) * DEG;
  const phi = latDeg * DEG;
  const dec = decDeg * DEG;
  const cosA = (Math.sin(dec) - Math.sin(phi) * Math.sin(h)) / (Math.cos(phi) * Math.cos(h));
  if (cosA < -1 || cosA > 1) return null;
  const a = Math.acos(cosA) / DEG;
  return event === 'rising' ? a : 360 - a;
}

/** The sky value the axis is compared with: an altitude or an azimuth, degrees. */
export function skyValueDeg(
  spec: Pick<AlignmentSpec, 'kind' | 'meridian'>,
  decDeg: number,
  latDeg: number,
  a: Pick<Assumptions, 'horizonDeg' | 'refraction'>
): number | null {
  if (spec.kind === 'culmination') {
    return culminationAltitudeDeg(decDeg, latDeg, spec.meridian ?? 'south', a.refraction);
  }
  return horizonAzimuthDeg(decDeg, latDeg, a.horizonDeg, spec.kind, a.refraction);
}

/** Signed difference sky − axis in degrees; azimuths wrap. */
export function errorDeg(kind: AlignmentKind, sky: number, axis: number): number {
  const d = sky - axis;
  return kind === 'culmination' ? d : ((((d + 180) % 360) + 360) % 360) - 180;
}

export interface YearSample {
  year: number;
  /** Sky value, degrees; null when the star never gets there that year. */
  value: number | null;
  error: number | null;
}

export interface AlignmentResult {
  samples: YearSample[];
  /** Year ranges (astronomical) where |error| ≤ tolerance. */
  fits: { start: number; end: number }[];
  /** Closest match in the sampled range. */
  best: { year: number; errorDeg: number } | null;
  /** Whether any year inside the claimed epoch range fits. */
  fitsClaimedRange: boolean;
}

/** Samples the alignment over `[from, to]` every `step` years. */
export function evaluateAlignment(
  spec: AlignmentSpec,
  row: StarRow,
  latDeg: number,
  a: Assumptions,
  range: { from: number; to: number; step: number }
): AlignmentResult {
  const samples: YearSample[] = [];
  for (let year = range.from; year <= range.to; year += range.step) {
    const dec = starOfDate(row, year).dec / DEG;
    const value = skyValueDeg(spec, dec, latDeg, a);
    samples.push({
      year,
      value,
      error: value === null ? null : errorDeg(spec.kind, value, a.axisDeg),
    });
  }

  const fits: { start: number; end: number }[] = [];
  let best: AlignmentResult['best'] = null;
  for (const s of samples) {
    if (s.error === null) continue;
    if (!best || Math.abs(s.error) < Math.abs(best.errorDeg)) {
      best = { year: s.year, errorDeg: s.error };
    }
    if (Math.abs(s.error) > a.toleranceDeg) continue;
    const last = fits.at(-1);
    if (last && last.end === s.year - range.step) last.end = s.year;
    else fits.push({ start: s.year, end: s.year });
  }

  const fitsClaimedRange = fits.some((f) => f.start <= spec.epochEnd && f.end >= spec.epochStart);
  return { samples, fits, best, fitsClaimedRange };
}

export interface CombinationCount {
  fit: number;
  total: number;
  /** Every assumption set tried, and whether it fits inside the claimed range. */
  combinations: { assumptions: Assumptions; fits: boolean }[];
}

/**
 * How many reasonable assumption sets still put the target on the axis inside the
 * claimed epoch range: the axis value at its stated uncertainty (low, as given, high),
 * refraction on or off, and for horizon events, three horizon heights.
 */
export function countFittingCombinations(
  spec: AlignmentSpec,
  row: StarRow,
  latDeg: number,
  toleranceDeg: number
): CombinationCount {
  const u = spec.axisUncertaintyDeg;
  const axes = u > 0 ? [spec.axisDeg - u, spec.axisDeg, spec.axisDeg + u] : [spec.axisDeg];
  const horizons = spec.kind === 'culmination' ? [0] : [0, 0.5, 1];
  const combinations: CombinationCount['combinations'] = [];
  const step = Math.max(1, Math.ceil((spec.epochEnd - spec.epochStart) / 40));
  for (const axisDeg of axes) {
    for (const horizonDeg of horizons) {
      for (const withRefraction of [true, false]) {
        const assumptions = { axisDeg, toleranceDeg, horizonDeg, refraction: withRefraction };
        const r = evaluateAlignment(spec, row, latDeg, assumptions, {
          from: spec.epochStart,
          to: spec.epochEnd,
          step,
        });
        combinations.push({ assumptions, fits: r.fits.length > 0 });
      }
    }
  }
  return {
    fit: combinations.filter((c) => c.fits).length,
    total: combinations.length,
    combinations,
  };
}

/**
 * A night when the star crosses the meridian close to local midnight, in the given
 * year: the day of year and the local solar time of the crossing.
 */
export function nightCulmination(
  year: number,
  starRaRad: number,
  latDeg: number,
  lonDeg: number
): { dayOfYear: number; solarHour: number } {
  const hourOn = (dayOfYear: number) => {
    const sunRa = raDecFromVec(
      solveSky({ year, dayOfYear, solarHour: 12, latDeg, lonDeg }).sun.vec
    ).ra;
    // Local sidereal time equals the star's RA at the crossing.
    return (((12 + (starRaRad - sunRa) / (15 * DEG)) % 24) + 24) % 24;
  };
  const fromMidnight = (h: number) => Math.min(h, 24 - h);
  const days = daysInYear(year);
  let bestDay = 1;
  for (let d = 1; d <= days; d += 5) {
    if (fromMidnight(hourOn(d)) < fromMidnight(hourOn(bestDay))) bestDay = d;
  }
  for (let d = Math.max(1, bestDay - 5); d <= Math.min(days, bestDay + 5); d++) {
    if (fromMidnight(hourOn(d)) < fromMidnight(hourOn(bestDay))) bestDay = d;
  }
  return { dayOfYear: bestDay, solarHour: Math.round(hourOn(bestDay) * 4) / 4 };
}
