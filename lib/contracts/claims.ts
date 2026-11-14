import { z } from 'zod';

import { BASIS, PROPONENT_KINDS, RECEPTION, SOURCE_TYPES, VIEW_SIDES } from '@/lib/vocab';

import { Provenance, requireEvidenceWhenVerified, Slug } from './site';

// Claims, the people who argue them, and the contested questions the Views tab shows.
// Hand-written contracts (planning handoff, sections 5 and 8). Additive changes only.

/** A document or episode. Passages and timestamped quotes (evidence) point at sources. */
export const Source = Provenance.extend({
  slug: Slug,
  title: z.string().min(1),
  authors: z.array(z.string().min(1)).default([]),
  publisher: z.string().optional(),
  url: z.url().optional(),
  /** Publication year (astronomical integer). */
  year: z.number().int().optional(),
  type: z.enum(SOURCE_TYPES),
}).superRefine(requireEvidenceWhenVerified);
export type Source = z.infer<typeof Source>;

/** A person or institution who argues claims. Modelled individually, never as a camp. */
export const Proponent = Provenance.extend({
  slug: Slug,
  name: z.string().min(1),
  kind: z.enum(PROPONENT_KINDS),
  /** One line: who they are, in neutral terms. */
  description: z.string().min(1),
}).superRefine(requireEvidenceWhenVerified);
export type Proponent = z.infer<typeof Proponent>;

/** A proposition with two labels: where it stands among specialists, and what kind of claim it is. */
export const Claim = Provenance.extend({
  slug: Slug,
  siteSlug: Slug,
  structureSlug: Slug.nullable().default(null),
  /** The contested question this claim answers, if any. */
  questionSlug: Slug.nullable().default(null),
  side: z.enum(VIEW_SIDES).nullable().default(null),
  statement: z.string().min(1),
  reception: z.enum(RECEPTION),
  basis: z.enum(BASIS),
  proponentSlugs: z.array(Slug).default([]),
  /** A broad group that holds the view, when no individual proponent is recorded. */
  heldBy: z.string().min(1).optional(),
  /** The evidence its supporters point to, in plain words. */
  evidenceCited: z.array(z.string().min(1)).default([]),
  /** Limits its supporters acknowledge, or objections from critics. */
  limits: z.array(z.string().min(1)).default([]),
  sourceSlugs: z.array(Slug).default([]),
}).superRefine(requireEvidenceWhenVerified);
export type Claim = z.infer<typeof Claim>;

/** A question with mainstream and alternative answers, shown side by side. */
export const Question = Provenance.extend({
  slug: Slug,
  siteSlug: Slug,
  title: z.string().min(1),
  agreements: z.array(z.string().min(1)).default([]),
  differences: z.array(z.string().min(1)).default([]),
  /** Evidence that would confirm or rule out each view. */
  whatWouldSettleIt: z.array(z.string().min(1)).default([]),
}).superRefine(requireEvidenceWhenVerified);
export type Question = z.infer<typeof Question>;
