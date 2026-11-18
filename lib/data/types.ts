import type { AlignmentHypothesis, ReferenceQuantity } from '@/lib/contracts/alignment';
import type { Claim, Proponent, Question, Source } from '@/lib/contracts/claims';
import type { Anchor, Measurement, Site, Structure } from '@/lib/contracts/site';
import type { TimelineEvent } from '@/lib/contracts/timeline';

/**
 * Data-access interface. The mock implementation reads typed, Zod-validated files;
 * a Neon/Drizzle implementation replaces it once the schema settles (milestone 6).
 * Later milestones add evidence search here.
 */
export interface SiteData {
  listSites(): Promise<Site[]>;
  getSite(slug: string): Promise<Site | null>;
  listStructures(siteSlug: string): Promise<Structure[]>;
  getMeasurements(structureSlug: string): Promise<Measurement[]>;
  listAnchors(siteSlug: string): Promise<Anchor[]>;
  /** Added in M3, for the info panel. */
  listClaims(siteSlug: string): Promise<Claim[]>;
  listQuestions(siteSlug: string): Promise<Question[]>;
  listProponents(slugs: string[]): Promise<Proponent[]>;
  listSources(slugs: string[]): Promise<Source[]>;
  listTimeline(siteSlug: string): Promise<TimelineEvent[]>;
  listAlignments(siteSlug: string): Promise<AlignmentHypothesis[]>;
  listReferenceQuantities(): Promise<ReferenceQuantity[]>;
}
