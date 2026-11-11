import { z } from 'zod';

import { Anchor, Measurement, Site, Structure } from '@/lib/contracts/site';
import type { SiteData } from '@/lib/data/types';

import { gizaAnchors, gizaMeasurements, gizaSite, gizaStructures } from './giza';

// Parse once at module load, so mock data can't drift from the contracts:
// a bad record fails the build, tests and dev server instead of rendering.
const sites = z.array(Site).parse([gizaSite]);
const structures = z.array(Structure).parse(gizaStructures);
const measurements = z.array(Measurement).parse(gizaMeasurements);
const anchors = z.array(Anchor).parse(gizaAnchors);

function assertUnique(kind: string, slugs: string[]) {
  const seen = new Set<string>();
  for (const slug of slugs) {
    if (seen.has(slug)) throw new Error(`Duplicate ${kind} slug in mock data: ${slug}`);
    seen.add(slug);
  }
}
assertUnique(
  'site',
  sites.map((s) => s.slug)
);
assertUnique(
  'structure',
  structures.map((s) => s.slug)
);
assertUnique(
  'anchor',
  anchors.map((a) => a.slug)
);
assertUnique(
  'measurement',
  measurements.map((m) => m.slug)
);

for (const s of structures) {
  if (!sites.some((site) => site.slug === s.siteSlug)) {
    throw new Error(`Structure ${s.slug} points at unknown site ${s.siteSlug}`);
  }
}
for (const m of measurements) {
  if (!structures.some((s) => s.slug === m.structureSlug)) {
    throw new Error(`Measurement ${m.slug} points at unknown structure ${m.structureSlug}`);
  }
}
for (const a of anchors) {
  if (!sites.some((site) => site.slug === a.siteSlug)) {
    throw new Error(`Anchor ${a.slug} points at unknown site ${a.siteSlug}`);
  }
  if (a.structureSlug && !structures.some((s) => s.slug === a.structureSlug)) {
    throw new Error(`Anchor ${a.slug} points at unknown structure ${a.structureSlug}`);
  }
}
const preferredKeys = measurements
  .filter((m) => m.preferred)
  .map((m) => `${m.structureSlug}/${m.property}/${m.condition}`);
assertUnique('preferred measurement', preferredKeys);

export const mockSiteData: SiteData = {
  async listSites() {
    return sites;
  },
  async getSite(slug) {
    return sites.find((s) => s.slug === slug) ?? null;
  },
  async listStructures(siteSlug) {
    return structures.filter((s) => s.siteSlug === siteSlug);
  },
  async getMeasurements(structureSlug) {
    return measurements.filter((m) => m.structureSlug === structureSlug);
  },
  async listAnchors(siteSlug) {
    return anchors.filter((a) => a.siteSlug === siteSlug);
  },
};

/** Synchronous access for build scripts (model generator, terrain), which run outside Next. */
export const mockRecords = { sites, structures, measurements, anchors };
