import { describe, expect, it } from 'vitest';

import { Measurement } from '@/lib/contracts/site';

import { mockSiteData } from '.';

describe('mock site data', () => {
  it('serves Giza with its structures and measurements', async () => {
    const giza = await mockSiteData.getSite('giza');
    expect(giza?.name).toBe('Giza');

    const structures = await mockSiteData.listStructures('giza');
    expect(structures.map((s) => s.slug)).toContain('great-pyramid');

    const measurements = await mockSiteData.getMeasurements('great-pyramid');
    expect(measurements.length).toBeGreaterThan(0);
  });

  it('returns null or empty for unknown slugs', async () => {
    expect(await mockSiteData.getSite('atlantis')).toBeNull();
    expect(await mockSiteData.listStructures('atlantis')).toEqual([]);
    expect(await mockSiteData.getMeasurements('nope')).toEqual([]);
  });

  it('flags every placeholder record as unverified', async () => {
    const sites = await mockSiteData.listSites();
    for (const site of sites) {
      expect(site.unverified).toBe(true);
      const structures = await mockSiteData.listStructures(site.slug);
      for (const structure of structures) {
        expect(structure.unverified).toBe(true);
        for (const m of await mockSiteData.getMeasurements(structure.slug)) {
          expect(m.unverified).toBe(true);
        }
      }
    }
  });

  it('refuses a verified measurement with no evidence', () => {
    const result = Measurement.safeParse({
      slug: 'x-height-as-built',
      structureSlug: 'x',
      property: 'height',
      condition: 'as_built',
      value: 10,
      unverified: false,
    });
    expect(result.success).toBe(false);
  });
});

describe('panel data', () => {
  it('collects everything the Giza panel shows, and every tab has data', async () => {
    const { getPanelData, availableTabs } = await import('../panel');
    const panel = await getPanelData(mockSiteData, 'giza');
    expect(availableTabs(panel)).toEqual({ facts: true, sky: true, timeline: true, views: true });
    expect(panel.proponents.map((p) => p.slug)).toContain('robert-schoch');
    expect(panel.sources.map((s) => s.slug)).toContain('schoch-forgotten-civilization');
    // Placeholders stay flagged.
    for (const list of [
      panel.claims,
      panel.questions,
      panel.timeline,
      panel.alignments,
      panel.patterns,
    ]) {
      for (const r of list) expect(r.unverified).toBe(true);
    }
  });

  it('gives every numerical pattern a value the explorer can test', async () => {
    const { getPanelData } = await import('../panel');
    const { lengthsFrom, testPattern } = await import('@/lib/facts/coincidence');
    const panel = await getPanelData(mockSiteData, 'giza');
    expect(panel.patterns.length).toBeGreaterThan(0);
    const lengths = lengthsFrom(panel.measurements);
    for (const p of panel.patterns) {
      expect(testPattern(p, lengths, panel.references), p.slug).not.toBeNull();
      const claim = panel.claims.find((c) => c.slug === p.claimSlug);
      expect(claim?.basis, p.slug).toBe('numerical_pattern');
    }
  });

  it('hides every tab for a site with no data', async () => {
    const { getPanelData, availableTabs } = await import('../panel');
    const panel = await getPanelData(mockSiteData, 'atlantis');
    expect(availableTabs(panel)).toEqual({
      facts: false,
      sky: false,
      timeline: false,
      views: false,
    });
  });
});
