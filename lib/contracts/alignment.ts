import { z } from 'zod';

import { ALIGNMENT_KINDS, MERIDIAN_SIDES } from '@/lib/vocab';

import { Provenance, requireEvidenceWhenVerified, Slug } from './site';

/**
 * A proposed alignment between a structure axis and a celestial target. Whether it
 * holds is computed (lib/astro/alignment.ts), never stored.
 *
 * - `culmination`: the axis is an altitude (e.g. a shaft angle) on the meridian.
 * - `rising` / `setting`: the axis is an azimuth on the horizon.
 */
export const AlignmentHypothesis = Provenance.extend({
  slug: Slug,
  siteSlug: Slug,
  structureSlug: Slug,
  title: z.string().min(1),
  /** What the axis is, in plain words, e.g. "King's Chamber southern shaft". */
  axisLabel: z.string().min(1),
  kind: z.enum(ALIGNMENT_KINDS),
  /** For culminations: which side of the meridian the axis points to. */
  meridian: z.enum(MERIDIAN_SIDES).optional(),
  /** Degrees: an altitude for culminations, an azimuth from true north otherwise. */
  axisDeg: z.number(),
  /** Degrees: how far the axis value itself is uncertain. */
  axisUncertaintyDeg: z.number().nonnegative(),
  /** Celestial target key, e.g. `star:HIP-26727`. */
  targetKey: z.string().regex(/^(sun|moon|star|planet):[A-Za-z0-9-]+$/),
  targetName: z.string().min(1),
  /** Proposed date range (astronomical years). */
  epochStart: z.number().int(),
  epochEnd: z.number().int(),
  claimSlug: Slug.nullable().default(null),
})
  .refine((h) => h.kind !== 'culmination' || h.meridian !== undefined, {
    message: 'A culmination needs a meridian side',
    path: ['meridian'],
  })
  .refine((h) => h.epochEnd >= h.epochStart, {
    message: 'epochEnd must not be before epochStart',
    path: ['epochEnd'],
  })
  .superRefine(requireEvidenceWhenVerified);
export type AlignmentHypothesis = z.infer<typeof AlignmentHypothesis>;

/** HIP number from a `star:HIP-…` target key, or null for other targets. */
export function hipFromTargetKey(key: string): number | null {
  const m = /^star:HIP-(\d+)$/.exec(key);
  return m ? Number(m[1]) : null;
}

/** A constant used in comparisons, so every ratio states which definition it used. */
export const ReferenceQuantity = Provenance.extend({
  slug: Slug,
  name: z.string().min(1),
  /** Metres. */
  value: z.number().positive(),
  definition: z.string().min(1),
}).superRefine(requireEvidenceWhenVerified);
export type ReferenceQuantity = z.infer<typeof ReferenceQuantity>;
