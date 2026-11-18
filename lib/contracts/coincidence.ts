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

/** Which kinds of ratio a search makes. */
export const PAIRINGS = ['reference-over-length', 'length-over-length'] as const;
export type Pairing = (typeof PAIRINGS)[number];

/**
 * A coincidence-explorer search, as scene state (URL, UI and chat share it). Every
 * field is optional: a missing field means the default (everything the data offers;
 * targets are the claim's number with a pattern, every family without one).
 */
export const ExplorerSettings = z.object({
  structures: z.array(Slug).max(50).optional(),
  lengths: z.array(z.enum(LENGTH_QUANTITIES)).optional(),
  conditions: z.array(z.enum(MEASUREMENT_CONDITIONS)).optional(),
  /** Reference quantity slugs. */
  references: z.array(Slug).max(50).optional(),
  pairings: z.array(z.enum(PAIRINGS)).optional(),
  /** Target families: `claim` (the pattern's own number) or a family slug. */
  targets: z.array(Slug).max(20).optional(),
  /** Count 432, 4,320 and 43,200 as one number. */
  shiftDecimal: z.boolean().optional(),
  /** Relative tolerance, e.g. 0.005 for ±0.5 %. */
  tolerance: z.number().positive().max(1).optional(),
});
export type ExplorerSettings = z.infer<typeof ExplorerSettings>;

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
