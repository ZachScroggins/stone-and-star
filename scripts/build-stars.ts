// Build public/data/stars-hip-v1.json from data/raw/hip.tsv (see fetch-data.sh).
// Run: npx tsx scripts/build-stars.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { STAR_CATALOG_FIELDS, StarCatalogV1 } from '../lib/astro/catalog';

const root = join(import.meta.dirname, '..');
const lines = readFileSync(join(root, 'data/raw/hip.tsv'), 'utf8')
  .split('\n')
  .filter((l) => l.trim() && !l.startsWith('#'));

const header = lines[0].split('\t').map((h) => h.trim());
const col = (name: string) => {
  const i = header.indexOf(name);
  if (i < 0) throw new Error(`Missing column ${name}`);
  return i;
};
const iHip = col('HIP');
const iV = col('Vmag');
const iRa = col('_RAJ2000');
const iDe = col('_DEJ2000');
const iPmRa = col('pmRA');
const iPmDe = col('pmDE');
const iBv = col('B-V');

const round = (x: number, d: number) => Number(x.toFixed(d));
const num = (s: string | undefined) => {
  const t = (s ?? '').trim();
  return t === '' ? null : Number(t);
};

const stars: number[][] = [];
let skipped = 0;
// Skip the units and dashes rows under the header.
for (const line of lines.slice(1)) {
  const f = line.split('\t');
  const hip = num(f[iHip]);
  const v = num(f[iV]);
  const ra = num(f[iRa]);
  const de = num(f[iDe]);
  if (hip === null || !Number.isInteger(hip) || v === null || ra === null || de === null) {
    skipped++;
    continue;
  }
  stars.push([
    hip,
    round(ra, 6),
    round(de, 6),
    round(num(f[iPmRa]) ?? 0, 2),
    round(num(f[iPmDe]) ?? 0, 2),
    round(v, 2),
    // Missing colour index: treat as white (B−V 0.6 is roughly solar).
    round(num(f[iBv]) ?? 0.6, 3),
  ]);
}
stars.sort((a, b) => a[5] - b[5]);

const catalog = StarCatalogV1.parse({
  v: 1,
  source:
    'ESA 1997, The Hipparcos and Tycho Catalogues, ESA SP-1200 (CDS I/239). Stars with V < 6.5; positions at epoch J2000 from VizieR.',
  epoch: 'J2000',
  fields: STAR_CATALOG_FIELDS,
  stars,
});

const out = join(root, 'public/data/stars-hip-v1.json');
writeFileSync(out, JSON.stringify(catalog));
console.log(`Wrote ${stars.length} stars (${skipped} rows skipped) to ${out}`);
