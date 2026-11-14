import { z } from 'zod';

import { DATE_PRECISIONS } from '@/lib/vocab';

import { Provenance, requireEvidenceWhenVerified, Slug } from './site';

/** Years are astronomical integers (1 BCE = 0). Build them with `fromBce()`. */
const Year = z.number().int();

const YearRange = z
  .object({ start: Year, end: Year })
  .refine((r) => r.end >= r.start, { message: 'end must not be before start', path: ['end'] });

/** A dating another source gives for the same event: shown in "Sources disagree". */
export const AlternativeDating = YearRange.and(
  z.object({
    precision: z.enum(DATE_PRECISIONS),
    /** Who gives this dating, in plain words. */
    label: z.string().min(1),
    sourceSlug: Slug.optional(),
  })
);

export const TimelineEvent = Provenance.extend({
  slug: Slug,
  siteSlug: Slug,
  structureSlug: Slug.nullable().default(null),
  title: z.string().min(1),
  start: Year,
  end: Year,
  precision: z.enum(DATE_PRECISIONS),
  /** Verbatim source passage with the date in it. Empty until sourced. */
  passage: z.string().optional(),
  sourceSlugs: z.array(Slug).default([]),
  alternatives: z.array(AlternativeDating).default([]),
})
  .refine((e) => e.end >= e.start, { message: 'end must not be before start', path: ['end'] })
  .superRefine(requireEvidenceWhenVerified);
export type TimelineEvent = z.infer<typeof TimelineEvent>;
