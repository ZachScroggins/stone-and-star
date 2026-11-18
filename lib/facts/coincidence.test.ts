import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ReferenceQuantity } from '@/lib/contracts/alignment';
import { Measurement } from '@/lib/contracts/site';
import { gizaMeasurements } from '@/lib/data/mock/giza';
import { referenceQuantities } from '@/lib/data/mock/giza-panel';

import {
  analyze,
  chanceOfMatch,
  closestTarget,
  enumerateCandidates,
  fullSpace,
  lengthsFrom,
  logWindow,
  ROUND_NUMBERS,
  standOutTolerance,
  TARGET_FAMILIES,
  testPattern,
} from './coincidence';

const measurements = z.array(Measurement).parse(gizaMeasurements);
const references = z.array(ReferenceQuantity).parse(referenceQuantities);
const lengths = lengthsFrom(measurements);

describe('lengthsFrom', () => {
  it('keeps stored lengths and derives the rest from a square base', () => {
    const gp = (length: string, condition = 'as_built') =>
      lengths.find(
        (l) =>
          l.structureSlug === 'great-pyramid' && l.length === length && l.condition === condition
      )?.value;
    expect(gp('height')).toBe(146.6);
    expect(gp('base-side-length')).toBe(230.3);
    expect(gp('perimeter')).toBeCloseTo(921.2, 6);
    expect(gp('half-base')).toBeCloseTo(115.15, 6);
    expect(gp('base-diagonal')).toBeCloseTo(230.3 * Math.SQRT2, 6);
    expect(gp('slant-height')).toBeCloseTo(Math.hypot(146.6, 115.15), 6);
  });

  it('derives nothing when an input is missing in that condition', () => {
    // Only the surviving height is stored, so no surviving base or slant height.
    const surviving = lengths.filter(
      (l) => l.structureSlug === 'great-pyramid' && l.condition === 'surviving'
    );
    expect(surviving.map((l) => l.length)).toEqual(['height']);
  });

  it('ignores angles', () => {
    const angle = Measurement.parse({
      slug: 'great-pyramid-side-slope-as-built',
      structureSlug: 'great-pyramid',
      property: 'side-slope',
      condition: 'as_built',
      value: 51.84,
      unverified: true,
    });
    expect(lengthsFrom([angle])).toEqual([]);
  });
});

describe('enumerateCandidates', () => {
  // Giza mock data: three pyramids with an as-built height and base (6 lengths each,
  // 18) plus two surviving heights = 20 lengths.
  it('counts constant ÷ length candidates: 20 lengths × 4 constants', () => {
    const space = {
      ...fullSpace(lengths, references),
      pairings: ['reference-over-length' as const],
    };
    expect(enumerateCandidates(lengths, references, space)).toHaveLength(80);
  });

  it('counts length ÷ length candidates within a structure, skipping fixed ratios', () => {
    // Per as-built pyramid: 6 × 5 = 30 ordered pairs, less the 12 among base side,
    // perimeter, half base and diagonal (fixed by definition) = 18. Three pyramids: 54.
    const space = { ...fullSpace(lengths, references), pairings: ['length-over-length' as const] };
    const candidates = enumerateCandidates(lengths, references, space);
    expect(candidates).toHaveLength(54);
    const keys = candidates.map((c) => c.key);
    expect(keys).not.toContain('great-pyramid.perimeter.as_built/great-pyramid.half-base.as_built');
    expect(keys).toContain('great-pyramid.perimeter.as_built/great-pyramid.height.as_built');
  });

  it('counts the full space: 80 + 54 = 134', () => {
    expect(enumerateCandidates(lengths, references, fullSpace(lengths, references))).toHaveLength(
      134
    );
  });

  it('narrows with the space', () => {
    const space = {
      structures: ['great-pyramid'],
      lengths: ['height' as const],
      conditions: ['as_built' as const],
      references: ['earth-polar-radius'],
      pairings: ['reference-over-length' as const],
    };
    const [only, ...rest] = enumerateCandidates(lengths, references, space);
    expect(rest).toHaveLength(0);
    expect(only.value).toBeCloseTo(6_356_752.314 / 146.6, 6);
    expect(only.key).toBe('earth-polar-radius/great-pyramid.height.as_built');
  });
});

describe('closestTarget', () => {
  it('finds the nearest target and its signed offset', () => {
    const m = closestTarget(43_361.2, [43_200, 25_920], false);
    expect(m?.target).toBe(43_200);
    expect(m?.scaled).toBe(43_200);
    expect(m?.offset).toBeCloseTo(161.2 / 43_200, 9);
  });

  it('shifts the decimal point when allowed', () => {
    expect(closestTarget(4_336.12, [43_200], true)?.scaled).toBeCloseTo(4_320, 9);
    expect(closestTarget(0.4336, [43_200], true)?.scaled).toBeCloseTo(0.432, 12);
    // Without shifting, 4,336 is nowhere near 43,200.
    expect(closestTarget(4_336.12, [43_200], false)?.offset).toBeLessThan(-0.89);
  });
});

describe('chanceOfMatch', () => {
  // A ratio's leading digits are taken as evenly spread on a log scale (Benford), so
  // the chance of landing within a window is the window's share of a decade.
  it('is the window width over a decade for one target', () => {
    const w = logWindow(0.01);
    expect(chanceOfMatch(43_000, [43_200], 0.01, false)).toBeCloseTo(2 * w, 12);
    expect(chanceOfMatch(43_000, [43_200], 0.01, true)).toBeCloseTo(2 * w, 12);
  });

  it('only counts targets in the same decade unless the decimal can shift', () => {
    expect(chanceOfMatch(4_300, [43_200], 0.01, false)).toBe(0);
    expect(chanceOfMatch(4_300, [43_200], 0.01, true)).toBeCloseTo(2 * logWindow(0.01), 12);
  });

  it('counts overlapping windows once', () => {
    // 432, 4,320 and 43,200 are one window once the decimal can shift.
    const w = logWindow(0.01);
    expect(chanceOfMatch(500, [432, 4_320, 43_200], 0.01, true)).toBeCloseTo(2 * w, 12);
    // Two targets 0.5 % apart with ±1 % windows overlap: less than two full windows.
    const p = chanceOfMatch(500, [432, 434.16], 0.01, true);
    expect(p).toBeGreaterThan(2 * w);
    expect(p).toBeLessThan(4 * w);
  });

  it('clips windows at the decade edge when the decimal is fixed', () => {
    // 10,000's window is half below 10^4, so a ratio in 10^4–10^5 sees only half.
    expect(chanceOfMatch(50_000, [10_000], 0.01, false)).toBeCloseTo(logWindow(0.01), 12);
  });

  it('wraps windows around the decade when the decimal can shift', () => {
    expect(chanceOfMatch(50_000, [10_000], 0.01, true)).toBeCloseTo(2 * logWindow(0.01), 12);
  });

  it('caps at certainty', () => {
    expect(chanceOfMatch(5, ROUND_NUMBERS, 0.5, true)).toBe(1);
  });
});

describe('analyze', () => {
  const candidates = enumerateCandidates(lengths, references, fullSpace(lengths, references));
  const precession = TARGET_FAMILIES.find((f) => f.slug === 'precession')!.values;

  it('lists matches nearest first and sums the chance model', () => {
    const r = analyze(candidates, precession, { tolerance: 0.005, shiftDecimal: true });
    expect(r.candidates).toBe(134);
    expect(r.matches.length).toBeGreaterThan(0);
    const offsets = r.matches.map((m) => Math.abs(m.offset));
    expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
    expect(r.matches.every((m) => Math.abs(m.offset) <= 0.005 + 1e-12)).toBe(true);
    // Five distinct digit patterns (72, 216, 2592, 36, 432), ±0.5 % each, per candidate.
    const p = 5 * 2 * logWindow(0.005);
    expect(r.expectedChanceMatches).toBeCloseTo(134 * p, 9);
    expect(r.chanceOfAnyMatch).toBeCloseTo(1 - (1 - p) ** 134, 9);
  });

  it('finds the tolerance at which a match stands out at 1 in 20', () => {
    const t = standOutTolerance(candidates, precession, true, 0.05);
    const r = analyze(candidates, precession, { tolerance: t, shiftDecimal: true });
    expect(r.chanceOfAnyMatch).toBeCloseTo(0.05, 6);
    expect(r.standOutTolerance).toBeCloseTo(t, 12);
    // Wider search, stricter bar.
    const one = candidates.slice(0, 1);
    expect(standOutTolerance(one, precession, true, 0.05)).toBeGreaterThan(t);
  });
});

describe('testPattern (height × 43,200 = polar radius)', () => {
  const pattern = {
    numerator: { kind: 'reference' as const, slug: 'earth-polar-radius' },
    denominator: {
      kind: 'length' as const,
      structureSlug: 'great-pyramid',
      length: 'height' as const,
      condition: 'as_built' as const,
    },
    target: 43_200,
  };

  it('computes the ratio and how far it is from the target', () => {
    const r = testPattern(pattern, lengths, references)!;
    expect(r.value).toBeCloseTo(43_361.2, 1);
    expect(r.offset).toBeCloseTo(0.00373, 5);
    // Within the window it sets, the pattern matches itself.
    expect(Math.abs(r.offset)).toBeLessThanOrEqual(r.tolerance + 1e-12);
  });

  it('is unlikely for one ratio predicted in advance', () => {
    const r = testPattern(pattern, lengths, references)!;
    expect(r.chanceAlone).toBeCloseTo(2 * logWindow(r.tolerance), 12);
    expect(r.chanceAlone).toBeLessThan(0.004);
  });

  it('is likely once the full space is searched for its digits', () => {
    const r = testPattern(pattern, lengths, references)!;
    const candidates = enumerateCandidates(lengths, references, fullSpace(lengths, references));
    const searched = analyze(candidates, [43_200], {
      tolerance: r.tolerance,
      shiftDecimal: true,
    });
    expect(searched.chanceOfAnyMatch).toBeGreaterThan(0.3);
    expect(searched.chanceOfAnyMatch).toBeLessThan(0.45);
    // The claim's own ratio is among the matches.
    expect(searched.matches.some((m) => m.candidate.key === r.key)).toBe(true);
  });

  it('returns null when a term has no value', () => {
    const missing = {
      ...pattern,
      denominator: {
        ...pattern.denominator,
        length: 'perimeter' as const,
        condition: 'surviving' as const,
      },
    };
    expect(testPattern(missing, lengths, references)).toBeNull();
  });
});
