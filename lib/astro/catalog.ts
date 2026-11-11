import { z } from 'zod';

/** Column order of each star row in the catalog file. */
export const STAR_CATALOG_FIELDS = [
  'hip',
  'raJ2000Deg',
  'decJ2000Deg',
  'pmRaCosDecMasYr',
  'pmDecMasYr',
  'vmag',
  'bv',
] as const;

export const StarCatalogV1 = z.object({
  v: z.literal(1),
  source: z.string(),
  epoch: z.literal('J2000'),
  fields: z.tuple(STAR_CATALOG_FIELDS.map((f) => z.literal(f)) as never),
  stars: z.array(z.array(z.number()).length(STAR_CATALOG_FIELDS.length)),
});
export type StarCatalogV1 = z.infer<typeof StarCatalogV1>;

export const STAR_CATALOG_URL = '/data/stars-hip-v1.json';
