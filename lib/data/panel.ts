import type { AlignmentHypothesis, ReferenceQuantity } from '@/lib/contracts/alignment';
import type { Claim, Proponent, Question, Source } from '@/lib/contracts/claims';
import type { Measurement, Structure } from '@/lib/contracts/site';
import type { TimelineEvent } from '@/lib/contracts/timeline';

import type { SiteData } from './types';

/** Everything the info panel shows for one site. Plain data, safe to pass to the client. */
export interface PanelData {
  structures: Structure[];
  measurements: Measurement[];
  references: ReferenceQuantity[];
  questions: Question[];
  claims: Claim[];
  proponents: Proponent[];
  sources: Source[];
  timeline: TimelineEvent[];
  alignments: AlignmentHypothesis[];
}

export async function getPanelData(data: SiteData, siteSlug: string): Promise<PanelData> {
  const [structures, claims, questions, timeline, alignments, references] = await Promise.all([
    data.listStructures(siteSlug),
    data.listClaims(siteSlug),
    data.listQuestions(siteSlug),
    data.listTimeline(siteSlug),
    data.listAlignments(siteSlug),
    data.listReferenceQuantities(),
  ]);
  const measurements = (
    await Promise.all(structures.map((s) => data.getMeasurements(s.slug)))
  ).flat();
  const sourceSlugs = new Set([
    ...claims.flatMap((c) => c.sourceSlugs),
    ...timeline.flatMap((e) => [
      ...e.sourceSlugs,
      ...e.alternatives.flatMap((a) => (a.sourceSlug ? [a.sourceSlug] : [])),
    ]),
  ]);
  const [proponents, sources] = await Promise.all([
    data.listProponents([...new Set(claims.flatMap((c) => c.proponentSlugs))]),
    data.listSources([...sourceSlugs]),
  ]);
  return {
    structures,
    measurements,
    references,
    questions,
    claims,
    proponents,
    sources,
    timeline,
    alignments,
  };
}

/** Which tabs have something to show. Tabs without data are hidden. */
export function availableTabs(p: PanelData) {
  return {
    facts: p.measurements.length > 0,
    sky: p.alignments.length > 0,
    timeline: p.timeline.length > 0,
    views: p.questions.some((q) => p.claims.some((c) => c.questionSlug === q.slug)),
  };
}
