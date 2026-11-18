// The coincidence explorer's engine (milestone 4). Deterministic: it enumerates
// every ratio a chosen set of measurements and reference constants can produce,
// finds the ones close to a set of target numbers, and asks how often that many
// candidates would come that close by chance. Nothing here is stored.
//
// Chance model: the leading digits of a ratio between unrelated quantities are
// spread evenly on a logarithmic scale (Benford's law), so the chance that a ratio
// lands within a relative tolerance of a target is the share of a decade that the
// target's window covers. With N candidates, the chance that at least one lands in
// some window is 1 − Π(1 − pᵢ).

import type { ReferenceQuantity } from '@/lib/contracts/alignment';
import {
  LENGTH_QUANTITIES,
  type LengthQuantity,
  type NumericalPattern,
  type PatternTerm,
} from '@/lib/contracts/coincidence';
import type { Measurement } from '@/lib/contracts/site';
import { MEASUREMENT_CONDITIONS, type MeasurementCondition } from '@/lib/vocab';

/** A length of one structure in one condition, stored or derived. */
export interface LengthValue {
  structureSlug: string;
  length: LengthQuantity;
  condition: MeasurementCondition;
  /** Metres. */
  value: number;
  /** Slugs of the measurements it comes from. */
  inputs: string[];
  unverified: boolean;
}

export const PAIRINGS = ['reference-over-length', 'length-over-length'] as const;
export type Pairing = (typeof PAIRINGS)[number];

/** Which freedoms the search uses. Every combination of them is one candidate. */
export interface CandidateSpace {
  structures: string[];
  lengths: LengthQuantity[];
  conditions: MeasurementCondition[];
  /** Reference quantity slugs. */
  references: string[];
  pairings: Pairing[];
}

export interface Candidate {
  /** Stable ID: `<numerator>/<denominator>`. */
  key: string;
  numerator: PatternTerm;
  denominator: PatternTerm;
  value: number;
}

/** Number families a pattern hunter might compare ratios against. */
export interface TargetFamily {
  slug: string;
  label: string;
  description: string;
  values: number[];
}

/** 1–9 at every power of ten from 0.001 to 10⁹: one significant figure. */
export const ROUND_NUMBERS: number[] = Array.from({ length: 13 }, (_, i) => i - 3).flatMap((k) =>
  [1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (k < 0 ? d / 10 ** -k : d * 10 ** k))
);

export const TARGET_FAMILIES: TargetFamily[] = [
  {
    slug: 'precession',
    label: 'Precession numbers',
    description:
      'Numbers built from 72, the years for the equinox to drift one degree: 72, 360, 2,160, 4,320, 25,920 and 43,200.',
    values: [72, 360, 2_160, 4_320, 25_920, 43_200],
  },
  {
    slug: 'round',
    label: 'Round numbers',
    description: 'One significant figure: 1 to 9 at any power of ten (3, 40, 500, 6,000 …).',
    values: ROUND_NUMBERS,
  },
  {
    slug: 'constants',
    label: 'Famous constants',
    description: 'π, 2π, φ (the golden ratio), e, √2 and √3.',
    values: [Math.PI, 2 * Math.PI, (1 + Math.sqrt(5)) / 2, Math.E, Math.SQRT2, Math.sqrt(3)],
  },
];

/** The share of a decade (log₁₀ units) on each side of a target, for a relative tolerance. */
export function logWindow(tolerance: number): number {
  return Math.log10(1 + tolerance);
}

// ── Lengths ─────────────────────────────────────────────────────────────────────

/**
 * Lengths from stored measurements: height and base side as measured, and the rest
 * derived assuming a square base. A derived length needs all its inputs in the same
 * condition. Angles are ignored.
 */
export function lengthsFrom(measurements: Measurement[]): LengthValue[] {
  const pick = (structureSlug: string, property: string, condition: MeasurementCondition) => {
    const rows = measurements.filter(
      (m) =>
        m.structureSlug === structureSlug && m.property === property && m.condition === condition
    );
    return rows.find((m) => m.preferred) ?? rows[0];
  };
  const structures = [...new Set(measurements.map((m) => m.structureSlug))];
  const out: LengthValue[] = [];
  for (const structureSlug of structures) {
    for (const condition of MEASUREMENT_CONDITIONS) {
      const h = pick(structureSlug, 'height', condition);
      const b = pick(structureSlug, 'base-side-length', condition);
      const make = (length: LengthQuantity, value: number, from: Measurement[]) => ({
        structureSlug,
        length,
        condition,
        value,
        inputs: from.map((m) => m.slug),
        unverified: from.some((m) => m.unverified),
      });
      const derived: Partial<Record<LengthQuantity, LengthValue>> = {};
      if (h) derived.height = make('height', h.value, [h]);
      if (b) {
        derived['base-side-length'] = make('base-side-length', b.value, [b]);
        derived.perimeter = make('perimeter', 4 * b.value, [b]);
        derived['half-base'] = make('half-base', b.value / 2, [b]);
        derived['base-diagonal'] = make('base-diagonal', b.value * Math.SQRT2, [b]);
      }
      if (h && b)
        derived['slant-height'] = make('slant-height', Math.hypot(h.value, b.value / 2), [h, b]);
      for (const length of LENGTH_QUANTITIES) {
        const v = derived[length];
        if (v) out.push(v);
      }
    }
  }
  return out;
}

// ── Candidates ──────────────────────────────────────────────────────────────────

/** Everything the data offers: every structure, length, condition, constant and pairing. */
export function fullSpace(lengths: LengthValue[], references: ReferenceQuantity[]): CandidateSpace {
  return {
    structures: [...new Set(lengths.map((l) => l.structureSlug))],
    lengths: LENGTH_QUANTITIES.filter((q) => lengths.some((l) => l.length === q)),
    conditions: MEASUREMENT_CONDITIONS.filter((c) => lengths.some((l) => l.condition === c)),
    references: references.map((r) => r.slug),
    pairings: [...PAIRINGS],
  };
}

export function termKey(t: PatternTerm): string {
  return t.kind === 'reference' ? t.slug : `${t.structureSlug}.${t.length}.${t.condition}`;
}

const lengthTerm = (l: LengthValue): PatternTerm => ({
  kind: 'length',
  structureSlug: l.structureSlug,
  length: l.length,
  condition: l.condition,
});

const sameInputs = (a: LengthValue, b: LengthValue) =>
  a.inputs.length === b.inputs.length && a.inputs.every((s) => b.inputs.includes(s));

/**
 * Every ratio in the space:
 * - constant ÷ length, for each chosen constant and length;
 * - length ÷ length, both ways, within one structure and condition. Pairs fixed by
 *   definition (perimeter ÷ base side is always 4) are skipped: both come from the
 *   same single measurement.
 */
export function enumerateCandidates(
  lengths: LengthValue[],
  references: ReferenceQuantity[],
  space: CandidateSpace
): Candidate[] {
  const chosen = lengths.filter(
    (l) =>
      space.structures.includes(l.structureSlug) &&
      space.lengths.includes(l.length) &&
      space.conditions.includes(l.condition)
  );
  const out: Candidate[] = [];
  const push = (numerator: PatternTerm, denominator: PatternTerm, value: number) =>
    out.push({
      key: `${termKey(numerator)}/${termKey(denominator)}`,
      numerator,
      denominator,
      value,
    });

  if (space.pairings.includes('reference-over-length')) {
    for (const r of references.filter((r) => space.references.includes(r.slug))) {
      for (const l of chosen)
        push({ kind: 'reference', slug: r.slug }, lengthTerm(l), r.value / l.value);
    }
  }
  if (space.pairings.includes('length-over-length')) {
    for (const a of chosen) {
      for (const b of chosen) {
        if (a === b || a.structureSlug !== b.structureSlug || a.condition !== b.condition) continue;
        if (a.inputs.length === 1 && sameInputs(a, b)) continue;
        push(lengthTerm(a), lengthTerm(b), a.value / b.value);
      }
    }
  }
  return out;
}

// ── Matching and chance ─────────────────────────────────────────────────────────

export interface TargetMatch {
  /** The target as listed (e.g. 43,200). */
  target: number;
  /** The target as compared, after any decimal shift (e.g. 4,320). */
  scaled: number;
  /** value ÷ scaled − 1. */
  offset: number;
  /** |log₁₀(value ÷ scaled)|: the distance the tolerance is measured in. */
  distance: number;
}

const scaleBy = (t: number, k: number) => (k < 0 ? t / 10 ** -k : t * 10 ** k);

/** The nearest target to a value, moving the target's decimal point if allowed. */
export function closestTarget(
  value: number,
  targets: number[],
  shiftDecimal: boolean
): TargetMatch | null {
  let best: TargetMatch | null = null;
  for (const target of targets) {
    const scaled = shiftDecimal
      ? scaleBy(target, Math.round(Math.log10(value) - Math.log10(target)))
      : target;
    const distance = Math.abs(Math.log10(value / scaled));
    if (!best || distance < best.distance) {
      best = { target, scaled, offset: value / scaled - 1, distance };
    }
  }
  return best;
}

/** Total length of a set of intervals, overlaps counted once. */
function unionLength(intervals: [number, number][]): number {
  const sorted = intervals.filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
  let total = 0;
  let end = -Infinity;
  for (const [a, b] of sorted) {
    if (b <= end) continue;
    total += b - Math.max(a, end);
    end = b;
  }
  return total;
}

/**
 * Chance that a ratio in this value's decade lands within the tolerance of a target
 * by luck. With the decimal fixed, only target windows inside the value's decade
 * count (its order of magnitude is set by the sizes involved; only its digits are
 * left to chance). With the decimal free, every target counts in every decade.
 */
export function chanceOfMatch(
  value: number,
  targets: number[],
  tolerance: number,
  shiftDecimal: boolean
): number {
  const w = logWindow(tolerance);
  if (2 * w >= 1 && shiftDecimal) return 1;
  const intervals: [number, number][] = [];
  if (shiftDecimal) {
    for (const t of targets) {
      const c = Math.log10(t) - Math.floor(Math.log10(t));
      const [a, b] = [c - w, c + w];
      intervals.push([Math.max(a, 0), Math.min(b, 1)]);
      if (a < 0) intervals.push([a + 1, 1]);
      if (b > 1) intervals.push([0, b - 1]);
    }
  } else {
    const d = Math.floor(Math.log10(value));
    for (const t of targets) {
      const c = Math.log10(t);
      intervals.push([Math.max(c - w, d), Math.min(c + w, d + 1)]);
    }
  }
  return Math.min(1, unionLength(intervals));
}

function chanceOfAny(
  candidates: Candidate[],
  targets: number[],
  tolerance: number,
  shift: boolean
) {
  let none = 1;
  let expected = 0;
  for (const c of candidates) {
    const p = chanceOfMatch(c.value, targets, tolerance, shift);
    none *= 1 - p;
    expected += p;
  }
  return { any: 1 - none, expected };
}

/**
 * The tolerance at which the chance of at least one lucky match reaches `alpha`.
 * A match closer than this stands out from chance at that level; one farther away
 * is what a search this wide should expect to find.
 */
export function standOutTolerance(
  candidates: Candidate[],
  targets: number[],
  shiftDecimal: boolean,
  alpha = 0.05
): number {
  if (candidates.length === 0 || targets.length === 0) return 1;
  const f = (t: number) => chanceOfAny(candidates, targets, t, shiftDecimal).any;
  let lo = 1e-9;
  let hi = 1;
  if (f(hi) < alpha) return hi;
  if (f(lo) >= alpha) return lo;
  // Bisect on a log scale: tolerances span orders of magnitude.
  for (let i = 0; i < 80; i++) {
    const mid = Math.sqrt(lo * hi);
    if (f(mid) < alpha) lo = mid;
    else hi = mid;
  }
  return Math.sqrt(lo * hi);
}

export interface CoincidenceMatch extends TargetMatch {
  candidate: Candidate;
}

export interface CoincidenceResult {
  candidates: number;
  /** Candidates within the tolerance of a target, nearest first. */
  matches: CoincidenceMatch[];
  /** Matches the chance model expects from luck alone. */
  expectedChanceMatches: number;
  /** Chance that luck alone gives at least one match. */
  chanceOfAnyMatch: number;
  /** See `standOutTolerance`. */
  standOutTolerance: number;
  alpha: number;
}

export function analyze(
  candidates: Candidate[],
  targets: number[],
  opts: { tolerance: number; shiftDecimal: boolean; alpha?: number }
): CoincidenceResult {
  const alpha = opts.alpha ?? 0.05;
  const w = logWindow(opts.tolerance);
  const matches: CoincidenceMatch[] = [];
  for (const candidate of candidates) {
    const m = closestTarget(candidate.value, targets, opts.shiftDecimal);
    if (m && m.distance <= w + 1e-12) matches.push({ ...m, candidate });
  }
  matches.sort((a, b) => a.distance - b.distance);
  const { any, expected } = chanceOfAny(candidates, targets, opts.tolerance, opts.shiftDecimal);
  return {
    candidates: candidates.length,
    matches,
    expectedChanceMatches: expected,
    chanceOfAnyMatch: any,
    standOutTolerance: standOutTolerance(candidates, targets, opts.shiftDecimal, alpha),
    alpha,
  };
}

// ── A claimed pattern ───────────────────────────────────────────────────────────

export interface PatternTest {
  key: string;
  value: number;
  /** value ÷ target − 1. */
  offset: number;
  /** The relative tolerance the pattern itself needs: its own closeness. */
  tolerance: number;
  /** Chance that one ratio, named in advance, lands this close to the target. */
  chanceAlone: number;
}

function termValue(t: PatternTerm, lengths: LengthValue[], references: ReferenceQuantity[]) {
  if (t.kind === 'reference') return references.find((r) => r.slug === t.slug)?.value;
  return lengths.find(
    (l) =>
      l.structureSlug === t.structureSlug && l.length === t.length && l.condition === t.condition
  )?.value;
}

/** Evaluate a claimed ratio on its own. Null when a term has no value in the data. */
export function testPattern(
  pattern: Pick<NumericalPattern, 'numerator' | 'denominator' | 'target'>,
  lengths: LengthValue[],
  references: ReferenceQuantity[]
): PatternTest | null {
  const n = termValue(pattern.numerator, lengths, references);
  const d = termValue(pattern.denominator, lengths, references);
  if (n === undefined || d === undefined) return null;
  const value = n / d;
  const tolerance = 10 ** Math.abs(Math.log10(value / pattern.target)) - 1;
  return {
    key: `${termKey(pattern.numerator)}/${termKey(pattern.denominator)}`,
    value,
    offset: value / pattern.target - 1,
    tolerance,
    chanceAlone: chanceOfMatch(value, [pattern.target], tolerance, false),
  };
}
