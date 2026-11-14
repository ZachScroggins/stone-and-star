// Build public/data/constellations-zodiac-v1.json from Stellarium's "modern" sky
// culture (data/raw/stellarium-modern-v26.3.json, see fetch-data.sh): the stick
// figures of the 12 zodiac constellations, as polylines of HIP numbers.
// Run: npx tsx scripts/build-constellations.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { StarCatalogV1 } from '../lib/astro/catalog';
import { ConstellationSetV1 } from '../lib/astro/constellations';

const root = join(import.meta.dirname, '..');

interface SkyCulture {
  zodiac: { names: { native: string; english: string }[] };
  constellations: {
    id: string;
    lines: (number | string)[][];
    common_name: { native: string; english: string };
  }[];
}

const culture = JSON.parse(
  readFileSync(join(root, 'data/raw/stellarium-modern-v26.3.json'), 'utf8')
) as SkyCulture;
const catalog = StarCatalogV1.parse(
  JSON.parse(readFileSync(join(root, 'public/data/stars-hip-v1.json'), 'utf8'))
);
const inCatalog = new Set(catalog.stars.map((row) => row[0]));

// The sky culture's zodiac list gives the order (Aries first) and the English names.
const constellations = culture.zodiac.names.map(({ native, english }) => {
  const c = culture.constellations.find((x) => x.common_name.native === native);
  if (!c) throw new Error(`No constellation named ${native}`);
  // Stellarium allows non-HIP star references (strings); the zodiac figures use none.
  const lines = c.lines.map((line) =>
    line.map((h) => {
      if (typeof h !== 'number') throw new Error(`${native}: non-HIP star ${h}`);
      if (!inCatalog.has(h)) throw new Error(`${native}: HIP ${h} is not in the star catalog`);
      return h;
    })
  );
  return { abbr: c.id.split(' ').at(-1)!, name: native, english, lines };
});

const set = ConstellationSetV1.parse({
  v: 1,
  source:
    'Stellarium 26.3, "modern" sky culture (skycultures/modern/index.json): stick figures of the 12 zodiac constellations. Stellarium\'s team.',
  license: 'CC BY-SA 4.0',
  constellations,
});

const out = join(root, 'public/data/constellations-zodiac-v1.json');
writeFileSync(out, JSON.stringify(set) + '\n');
console.log(`Wrote ${constellations.length} constellations to ${out}`);
