import { z } from 'zod';

import { MEASUREMENT_CONDITIONS } from '@/lib/vocab';

/**
 * Describes the generated models for a site. A model is itself a claim with
 * provenance: it records the generator version and the measurements it was built
 * from, and stays unverified while any of those measurements are.
 */
export const ModelManifestV1 = z.object({
  v: z.literal(1),
  siteSlug: z.string(),
  models: z.array(
    z.object({
      structureSlug: z.string(),
      anchorSlug: z.string(),
      condition: z.enum(MEASUREMENT_CONDITIONS),
      file: z.string(),
      generator: z.string(),
      params: z.record(z.string(), z.union([z.number(), z.boolean()])),
      measurementSlugs: z.array(z.string()),
      unverified: z.boolean(),
      triangles: z.number().int(),
    })
  ),
});
export type ModelManifestV1 = z.infer<typeof ModelManifestV1>;

export const modelManifestUrl = (siteSlug: string) => `/models/${siteSlug}/manifest.json`;
