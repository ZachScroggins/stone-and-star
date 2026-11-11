import { z } from 'zod';

import { MEASUREMENT_CONDITIONS } from '@/lib/vocab';

// Hand-written data contracts (not derived from tables). The mock data, the UI and,
// later, tools import these. Bump the schema version for breaking changes; prefer
// additive changes (new optional fields).

export const SITE_SCHEMA_VERSION = 1;

/** Public IDs are permanent kebab-case slugs used in URLs and tool calls. */
export const Slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Expected a kebab-case slug');

/**
 * Every record says whether it has been checked against a source. Placeholder data
 * is `unverified: true` and needs no evidence; a verified record must cite evidence.
 */
const Provenance = z.object({
  unverified: z.boolean(),
  evidenceIds: z.array(Slug).default([]),
  note: z.string().optional(),
});

function requireEvidenceWhenVerified<T extends z.infer<typeof Provenance>>(
  value: T,
  ctx: z.core.$RefinementCtx<T>
) {
  if (!value.unverified && value.evidenceIds.length === 0) {
    ctx.addIssue({
      code: 'custom',
      message: 'A verified record must cite at least one evidence ID',
      path: ['evidenceIds'],
    });
  }
}

export const Coordinates = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  /** Metres above mean sea level. */
  elevationM: z.number().optional(),
});

export const SITE_THEMES = ['neutral', 'egypt'] as const;

export const Site = Provenance.extend({
  slug: Slug,
  name: z.string().min(1),
  region: z.string().min(1),
  coordinates: Coordinates,
  summary: z.string().min(1),
  theme: z.enum(SITE_THEMES),
}).superRefine(requireEvidenceWhenVerified);
export type Site = z.infer<typeof Site>;

export const Structure = Provenance.extend({
  slug: Slug,
  siteSlug: Slug,
  parentSlug: Slug.nullable().default(null),
  name: z.string().min(1),
  kind: z.string().min(1),
  summary: z.string().optional(),
}).superRefine(requireEvidenceWhenVerified);
export type Structure = z.infer<typeof Structure>;

export const ANCHOR_KINDS = ['structure-center', 'corner', 'viewpoint', 'marker'] as const;

/**
 * A named geographic point. Overlays, camera targets and generated models attach
 * to anchors (never to mesh vertices), so regenerating a model never breaks data.
 */
export const Anchor = Provenance.extend({
  slug: Slug,
  siteSlug: Slug,
  structureSlug: Slug.nullable().default(null),
  name: z.string().min(1),
  kind: z.enum(ANCHOR_KINDS),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  /** Metres above mean sea level, if known. Otherwise the scene samples the terrain. */
  elevationM: z.number().optional(),
}).superRefine(requireEvidenceWhenVerified);
export type Anchor = z.infer<typeof Anchor>;

/** Open vocabulary (a lookup table later). Canonical units: metres and degrees. */
export const MEASUREMENT_PROPERTIES = {
  'base-side-length': { label: 'Base side length', unit: 'm' },
  height: { label: 'Height', unit: 'm' },
  'side-slope': { label: 'Side slope', unit: 'deg' },
} as const;
export type MeasurementProperty = keyof typeof MEASUREMENT_PROPERTIES;

const MeasurementPropertyKey = z.enum(
  Object.keys(MEASUREMENT_PROPERTIES) as [MeasurementProperty, ...MeasurementProperty[]]
);

/** A measurement is an assertion from a source, not a fact on a row. */
export const Measurement = Provenance.extend({
  slug: Slug,
  structureSlug: Slug,
  property: MeasurementPropertyKey,
  condition: z.enum(MEASUREMENT_CONDITIONS),
  /** Value in the property's canonical unit. */
  value: z.number().positive(),
  uncertainty: z.number().nonnegative().optional(),
  method: z.string().optional(),
  /** At most one preferred value per structure, property and condition. */
  preferred: z.boolean().default(false),
}).superRefine(requireEvidenceWhenVerified);
export type Measurement = z.infer<typeof Measurement>;
