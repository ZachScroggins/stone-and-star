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
