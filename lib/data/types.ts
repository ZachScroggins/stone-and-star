import type { Anchor, Measurement, Site, Structure } from '@/lib/contracts/site';

/**
 * Data-access interface. The mock implementation reads typed, Zod-validated files;
 * a Neon/Drizzle implementation replaces it once the schema settles (milestone 6).
 * Later milestones add timeline, claims and evidence search here.
 */
export interface SiteData {
  listSites(): Promise<Site[]>;
  getSite(slug: string): Promise<Site | null>;
  listStructures(siteSlug: string): Promise<Structure[]>;
  getMeasurements(structureSlug: string): Promise<Measurement[]>;
  listAnchors(siteSlug: string): Promise<Anchor[]>;
}
