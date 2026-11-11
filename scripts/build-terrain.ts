// Build public/data/giza-terrain-v1.json from the Copernicus GLO-30 tile in data/raw/.
// Run: npx tsx scripts/build-terrain.ts
//
// GLO-30 is a surface model: the pyramids themselves appear in it as 30 m bumps.
// The procedural models replace them, so each pyramid footprint is flattened to
// the median ground height just outside it.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { fromFile } from 'geotiff';

import { mockRecords } from '../lib/data/mock';
import { fromLocal, toLocal } from '../lib/geo/local';
import { TerrainV1 } from '../lib/scene/terrain';

// 151 × 30 m = 4.5 km square; a larger square would run past the tile's north edge (30°N).
const N = 151;
const SPACING_M = 30;
const HALF = ((N - 1) * SPACING_M) / 2;

async function main() {
  const root = join(import.meta.dirname, '..');
  const tiff = await fromFile(join(root, 'data/raw/cop_N29_E031.tif'));
  const image = await tiff.getImage();
  const width = image.getWidth();
  const height = image.getHeight();
  const raster = (await image.readRasters({ interleave: true })) as unknown as Float32Array;
  console.log({ width, height });

  // GLO-30 is PixelIsPoint (GTRasterTypeGeoKey 2): the tie point (west, north)
  // is the centre of the first pixel, so sample i sits at west + i * dx.
  if (image.getGeoKeys()?.GTRasterTypeGeoKey !== 2) throw new Error('Expected PixelIsPoint');
  const [originLon, originLat] = image.getOrigin();
  const [dx, negDy] = image.getResolution();
  const dy = -negDy;
  const sample = (lat: number, lon: number) => {
    const fx = (lon - originLon) / dx;
    const fy = (originLat - lat) / dy;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const at = (x: number, y: number) => raster[y * width + x];
    return (
      at(x0, y0) * (1 - tx) * (1 - ty) +
      at(x0 + 1, y0) * tx * (1 - ty) +
      at(x0, y0 + 1) * (1 - tx) * ty +
      at(x0 + 1, y0 + 1) * tx * ty
    );
  };

  const site = mockRecords.sites.find((s) => s.slug === 'giza')!;
  const origin = {
    lat: site.coordinates.lat,
    lon: site.coordinates.lon,
    elevationM: site.coordinates.elevationM ?? 0,
  };

  const heights = new Float32Array(N * N);
  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      const x = -HALF + col * SPACING_M;
      const z = -HALF + row * SPACING_M;
      const { lat, lon } = fromLocal(origin, x, z);
      heights[row * N + col] = sample(lat, lon);
    }
  }

  // Flatten pyramid footprints.
  const flattened: string[] = [];
  for (const anchor of mockRecords.anchors) {
    if (anchor.kind !== 'structure-center' || !anchor.structureSlug) continue;
    const base = mockRecords.measurements.find(
      (m) =>
        m.structureSlug === anchor.structureSlug &&
        m.property === 'base-side-length' &&
        m.condition === 'as_built'
    );
    if (!base) continue;
    const c = toLocal(origin, anchor.lat, anchor.lon);
    const half = base.value / 2;

    const ring: number[] = [];
    for (let a = 0; a < 64; a++) {
      const t = (a / 64) * 2 * Math.PI;
      const r = half * 1.25 + 20;
      const { lat, lon } = fromLocal(
        origin,
        c.x + Math.cos(t) * r * 1.1,
        c.z + Math.sin(t) * r * 1.1
      );
      ring.push(sample(lat, lon));
    }
    ring.sort((p, q) => p - q);
    const ground = ring[Math.floor(ring.length / 2)];
    const peak = sample(anchor.lat, anchor.lon);

    const inner = half + 10;
    const blend = 40;
    for (let row = 0; row < N; row++) {
      for (let col = 0; col < N; col++) {
        const x = -HALF + col * SPACING_M - c.x;
        const z = -HALF + row * SPACING_M - c.z;
        const d = Math.max(Math.abs(x), Math.abs(z));
        if (d >= inner + blend) continue;
        const w = d <= inner ? 1 : 1 - (d - inner) / blend;
        const i = row * N + col;
        heights[i] = heights[i] * (1 - w) + ground * w;
      }
    }
    flattened.push(
      `${anchor.structureSlug}: DEM peak ${peak.toFixed(1)} m at anchor, ground ${ground.toFixed(1)} m`
    );
  }
  console.log(flattened.join('\n'));

  const quantized = new Int16Array(N * N);
  for (let i = 0; i < quantized.length; i++) quantized[i] = Math.round(heights[i] * 10);

  const terrain = TerrainV1.parse({
    v: 1,
    source:
      'Copernicus GLO-30 DEM (tile N29 E031), © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018, provided under COPERNICUS by the European Union and ESA; all rights reserved. Pyramid footprints flattened.',
    origin,
    size: N,
    spacingM: SPACING_M,
    heightScale: 0.1,
    heightsB64: Buffer.from(quantized.buffer).toString('base64'),
  });
  const out = join(root, 'public/data/giza-terrain-v1.json');
  writeFileSync(out, JSON.stringify(terrain));
  let min = Infinity;
  let max = -Infinity;
  let bad = 0;
  for (const h of heights) {
    if (!Number.isFinite(h)) bad++;
    else {
      min = Math.min(min, h);
      max = Math.max(max, h);
    }
  }
  if (bad) throw new Error(`${bad} non-finite heights`);
  console.log(`Wrote ${N}x${N} grid, ${min.toFixed(1)}–${max.toFixed(1)} m, to ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
