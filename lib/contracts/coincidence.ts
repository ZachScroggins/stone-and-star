import { z } from 'zod';

import { MEASUREMENT_CONDITIONS } from '@/lib/vocab';

import { Provenance, requireEvidenceWhenVerified, Slug } from './site';

// Numerical-pattern claims in a testable form, for the coincidence explorer (M4).
// Hand-written contract; additive changes only.

/**
 * Lengths the explorer can use. `height` and `base-side-length` are stored
 * measurements; the rest are derived from them in code (lib/facts/coincidence.ts),
 * assuming a square base. Derived values are never stored.
 */
export const LENGTH_QUANTITIES = [
  'height',
  'base-side-length',
  'perimeter',
  'half-base',
  'base-diagonal',
  'slant-height',
] as const;
export type LengthQuantity = (typeof LENGTH_QUANTITIES)[number];

/** One side of a ratio: a reference constant, or a length of a structure in one condition. */
export const PatternTerm = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('reference'), slug: Slug }),
  z.object({
    kind: z.literal('length'),
    structureSlug: Slug,
    length: z.enum(LENGTH_QUANTITIES),
    condition: z.enum(MEASUREMENT_CONDITIONS),
  }),
]);
export type PatternTerm = z.infer<typeof PatternTerm>;

/**
 * A numerical-pattern claim stated as numerator ÷ denominator ≈ target, e.g.
 * "Earth's polar radius ÷ the Great Pyramid's height ≈ 43,200". Whether it stands
 * out from chance is computed, never stored.
 */
export const NumericalPattern = Provenance.extend({
  slug: Slug,
  siteSlug: Slug,
  claimSlug: Slug.nullable().default(null),
  /** Short name for the pattern, e.g. "Height × 43,200 = polar radius". */
  title: z.string().min(1),
  numerator: PatternTerm,
  denominator: PatternTerm,
  target: z.number().positive(),
}).superRefine(requireEvidenceWhenVerified);
export type NumericalPattern = z.infer<typeof NumericalPattern>;
