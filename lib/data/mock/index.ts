import { z } from 'zod';

import { AlignmentHypothesis, ReferenceQuantity } from '@/lib/contracts/alignment';
import { Claim, Proponent, Question, Source } from '@/lib/contracts/claims';
import { Anchor, Measurement, Site, Structure } from '@/lib/contracts/site';
import { TimelineEvent } from '@/lib/contracts/timeline';
import type { SiteData } from '@/lib/data/types';

import { gizaAnchors, gizaMeasurements, gizaSite, gizaStructures } from './giza';
import {
  gizaAlignments,
  gizaClaims,
  gizaProponents,
  gizaQuestions,
  gizaSources,
  gizaTimeline,
  referenceQuantities,
} from './giza-panel';

// Parse once at module load, so mock data can't drift from the contracts:
// a bad record fails the build, tests and dev server instead of rendering.
const sites = z.array(Site).parse([gizaSite]);
const structures = z.array(Structure).parse(gizaStructures);
const measurements = z.array(Measurement).parse(gizaMeasurements);
const anchors = z.array(Anchor).parse(gizaAnchors);
const sources = z.array(Source).parse(gizaSources);
const proponents = z.array(Proponent).parse(gizaProponents);
const questions = z.array(Question).parse(gizaQuestions);
const claims = z.array(Claim).parse(gizaClaims);
const timeline = z.array(TimelineEvent).parse(gizaTimeline);
const alignments = z.array(AlignmentHypothesis).parse(gizaAlignments);
const references = z.array(ReferenceQuantity).parse(referenceQuantities);

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
for (const [kind, records] of [
  ['source', sources],
  ['proponent', proponents],
  ['question', questions],
  ['claim', claims],
  ['timeline event', timeline],
  ['alignment', alignments],
  ['reference quantity', references],
] as const) {
  assertUnique(
    kind,
    records.map((r) => r.slug)
  );
}

function assertKnown(kind: string, slug: string, known: { slug: string }[], from: string) {
  if (!known.some((k) => k.slug === slug)) {
    throw new Error(`${from} points at unknown ${kind} ${slug}`);
  }
}
const structureRef = (slug: string | null, from: string) =>
  slug && assertKnown('structure', slug, structures, from);

for (const c of claims) {
  assertKnown('site', c.siteSlug, sites, `Claim ${c.slug}`);
  structureRef(c.structureSlug, `Claim ${c.slug}`);
  if (c.questionSlug) assertKnown('question', c.questionSlug, questions, `Claim ${c.slug}`);
  if ((c.questionSlug === null) !== (c.side === null)) {
    throw new Error(`Claim ${c.slug} needs both a question and a side, or neither`);
  }
  c.proponentSlugs.forEach((p) => assertKnown('proponent', p, proponents, `Claim ${c.slug}`));
  c.sourceSlugs.forEach((p) => assertKnown('source', p, sources, `Claim ${c.slug}`));
}
for (const e of timeline) {
  assertKnown('site', e.siteSlug, sites, `Timeline event ${e.slug}`);
  structureRef(e.structureSlug, `Timeline event ${e.slug}`);
  e.sourceSlugs.forEach((p) => assertKnown('source', p, sources, `Timeline event ${e.slug}`));
  e.alternatives.forEach(
    (a) => a.sourceSlug && assertKnown('source', a.sourceSlug, sources, `Timeline event ${e.slug}`)
  );
}
for (const a of alignments) {
  assertKnown('site', a.siteSlug, sites, `Alignment ${a.slug}`);
  structureRef(a.structureSlug, `Alignment ${a.slug}`);
  if (a.claimSlug) assertKnown('claim', a.claimSlug, claims, `Alignment ${a.slug}`);
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
  async listClaims(siteSlug) {
    return claims.filter((c) => c.siteSlug === siteSlug);
  },
  async listQuestions(siteSlug) {
    return questions.filter((q) => q.siteSlug === siteSlug);
  },
  async listProponents(slugs) {
    return proponents.filter((p) => slugs.includes(p.slug));
  },
  async listSources(slugs) {
    return sources.filter((s) => slugs.includes(s.slug));
  },
  async listTimeline(siteSlug) {
    return timeline
      .filter((e) => e.siteSlug === siteSlug)
      .toSorted((a, b) => a.start - b.start || a.end - b.end);
  },
  async listAlignments(siteSlug) {
    return alignments.filter((a) => a.siteSlug === siteSlug);
  },
  async listReferenceQuantities() {
    return references;
  },
};

/** Synchronous access for build scripts (model generator, terrain), which run outside Next. */
export const mockRecords = {
  sites,
  structures,
  measurements,
  anchors,
  claims,
  questions,
  timeline,
  alignments,
};
