import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { StarCatalogV1 } from './catalog';
import { figureSegments, SkyFiguresV1 } from './constellations';

const root = join(import.meta.dirname, '../..');
const read = (file: string) => JSON.parse(readFileSync(join(root, 'public/data', file), 'utf8'));

describe('sky figures file', () => {
  const set = SkyFiguresV1.parse(read('sky-figures-v1.json'));
  const catalog = StarCatalogV1.parse(read('stars-hip-v1.json'));

  it('has the 12 zodiac constellations, in order from Aries', () => {
    expect(set.figures.filter((f) => f.kind === 'constellation').map((c) => c.name)).toEqual([
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

  it('has the Big Dipper, Little Dipper, Orion’s Belt and Polaris', () => {
    expect(set.figures.filter((f) => f.kind === 'asterism').map((a) => a.name)).toEqual([
      'Big Dipper',
      'Little Dipper',
      "Orion's Belt",
    ]);
    expect(set.stars).toEqual([{ hip: 11767, name: 'Polaris' }]);
    // The Little Dipper's handle ends at Polaris.
    expect(set.figures.find((f) => f.id === 'LDr')?.lines[0][0]).toBe(11767);
  });

  it('only uses stars in the catalog', () => {
    const hips = new Set(catalog.stars.map((r) => r[0]));
    for (const f of set.figures) {
      for (const h of f.lines.flat()) expect(hips.has(h), `${f.id} HIP ${h}`).toBe(true);
    }
    for (const s of set.stars) expect(hips.has(s.hip), s.name).toBe(true);
  });

  it('turns polylines into segments', () => {
    expect(
      figureSegments({
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
