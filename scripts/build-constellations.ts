// Build public/data/sky-figures-v1.json from Stellarium's "modern" sky culture
// (data/raw/stellarium-modern-v26.3.json, see fetch-data.sh): the stick figures of
// the 12 zodiac constellations and a few well-known asterisms, as polylines of HIP
// numbers, plus individually named stars.
// Run: npx tsx scripts/build-constellations.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { StarCatalogV1 } from '../lib/astro/catalog';
import { SkyFiguresV1 } from '../lib/astro/constellations';

const root = join(import.meta.dirname, '..');

/** Asterisms to include, by Stellarium id suffix. */
const ASTERISMS = ['BDr', 'LDr', 'OrB'];
/** Stars labelled on their own, by HIP number. */
const NAMED_STARS = [11767];

interface SkyCulture {
  zodiac: { names: { native: string; english: string }[] };
  constellations: { id: string; lines: (number | string)[][]; common_name: { native: string } }[];
  asterisms: { id: string; lines: (number | string)[][]; common_name: { english: string } }[];
  common_names: Record<string, { native: string; english: string }[]>;
}

const culture = JSON.parse(
  readFileSync(join(root, 'data/raw/stellarium-modern-v26.3.json'), 'utf8')
) as SkyCulture;
const catalog = StarCatalogV1.parse(
  JSON.parse(readFileSync(join(root, 'public/data/stars-hip-v1.json'), 'utf8'))
);
const inCatalog = new Set(catalog.stars.map((row) => row[0]));

const idSuffix = (id: string) => id.split(' ').at(-1)!;

// Stellarium allows non-HIP star references (strings); these figures use none.
function hipLines(label: string, lines: (number | string)[][]) {
  return lines.map((line) =>
    line.map((h) => {
      if (typeof h !== 'number') throw new Error(`${label}: non-HIP star ${h}`);
      if (!inCatalog.has(h)) throw new Error(`${label}: HIP ${h} is not in the star catalog`);
      return h;
    })
  );
}

// The sky culture's zodiac list gives the order (Aries first) and the English names.
const zodiac = culture.zodiac.names.map(({ native, english }) => {
  const c = culture.constellations.find((x) => x.common_name.native === native);
  if (!c) throw new Error(`No constellation named ${native}`);
  return {
    id: idSuffix(c.id),
    kind: 'constellation' as const,
    name: native,
    english,
    lines: hipLines(native, c.lines),
  };
});

const asterisms = ASTERISMS.map((code) => {
  const a = culture.asterisms.find((x) => idSuffix(x.id) === code);
  if (!a) throw new Error(`No asterism ${code}`);
  const full = a.common_name.english;
  // "Big Dipper (Plough)": show the first name, keep the alternative as the English gloss.
  const alt = full.match(/\(([^)]+)\)/)?.[1];
  return {
    id: code,
    kind: 'asterism' as const,
    name: full.replace(/\s*\(.*\)$/, ''),
    english: alt ?? full,
    lines: hipLines(full, a.lines),
  };
});

const stars = NAMED_STARS.map((hip) => {
  const name = culture.common_names[`HIP ${hip}`]?.[0]?.english;
  if (!name) throw new Error(`No common name for HIP ${hip}`);
  if (!inCatalog.has(hip)) throw new Error(`HIP ${hip} is not in the star catalog`);
  return { hip, name };
});

const set = SkyFiguresV1.parse({
  v: 1,
  source:
    'Stellarium 26.3, "modern" sky culture (skycultures/modern/index.json): stick figures of the 12 zodiac constellations, the Big Dipper, Little Dipper and Orion\'s Belt asterisms, and star common names. Stellarium\'s team.',
  license: 'CC BY-SA 4.0',
  figures: [...zodiac, ...asterisms],
  stars,
});

const out = join(root, 'public/data/sky-figures-v1.json');
writeFileSync(out, JSON.stringify(set) + '\n');
console.log(
  `Wrote ${zodiac.length} constellations, ${asterisms.length} asterisms and ${stars.length} named stars to ${out}`
);
