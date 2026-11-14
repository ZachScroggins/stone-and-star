import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { StarCatalogV1 } from './catalog';
import { ConstellationSetV1, figureSegments } from './constellations';

const root = join(import.meta.dirname, '../..');
const read = (file: string) => JSON.parse(readFileSync(join(root, 'public/data', file), 'utf8'));

describe('zodiac constellations file', () => {
  const set = ConstellationSetV1.parse(read('constellations-zodiac-v1.json'));
  const catalog = StarCatalogV1.parse(read('stars-hip-v1.json'));

  it('has the 12 zodiac constellations, in order from Aries', () => {
    expect(set.constellations.map((c) => c.name)).toEqual([
      'Aries',
      'Taurus',
      'Gemini',
      'Cancer',
      'Leo',
      'Virgo',
      'Libra',
      'Scorpius',
      'Sagittarius',
      'Capricornus',
      'Aquarius',
      'Pisces',
    ]);
  });

  it('only uses stars in the catalog', () => {
    const hips = new Set(catalog.stars.map((r) => r[0]));
    for (const c of set.constellations) {
      for (const h of c.lines.flat()) expect(hips.has(h), `${c.abbr} HIP ${h}`).toBe(true);
    }
  });

  it('turns polylines into segments', () => {
    expect(
      figureSegments({
        abbr: 'Ari',
        name: 'Aries',
        english: 'Ram',
        lines: [
          [1, 2, 3],
          [4, 5],
        ],
      })
    ).toEqual([
      [1, 2],
      [2, 3],
      [4, 5],
    ]);
  });
});
