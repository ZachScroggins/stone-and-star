// Generate the Giza pyramid models from the (mock) measurement records and export
// them as binary glTF to public/models/giza/, with a manifest recording provenance.
// Run: npx tsx scripts/generate-models.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { Mesh, MeshStandardMaterial, Scene } from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

import { mockRecords } from '../lib/data/mock';
import { ModelManifestV1 } from '../lib/models/manifest';
import { buildPyramid, PYRAMID_GENERATOR_VERSION, type PyramidParams } from '../lib/models/pyramid';

// GLTFExporter reads Blobs through FileReader, which Node lacks.
class NodeFileReader {
  result: ArrayBuffer | string | null = null;
  onloadend: (() => void) | null = null;
  readAsArrayBuffer(blob: Blob) {
    blob.arrayBuffer().then((b) => {
      this.result = b;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob: Blob) {
    blob.arrayBuffer().then((b) => {
      this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(b).toString('base64')}`;
      this.onloadend?.();
    });
  }
}
(globalThis as unknown as { FileReader: unknown }).FileReader = NodeFileReader;

const SITE = 'giza';
const outDir = join(import.meta.dirname, '../public/models', SITE);

function measurement(structureSlug: string, property: string, condition: string) {
  return mockRecords.measurements.find(
    (m) =>
      m.structureSlug === structureSlug &&
      m.property === property &&
      m.condition === condition &&
      m.preferred
  );
}

async function exportGlb(params: PyramidParams, name: string): Promise<number> {
  const geometry = buildPyramid(params);
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  const mesh = new Mesh(geometry, material);
  mesh.name = name;
  const scene = new Scene();
  scene.add(mesh);
  const glb = (await new GLTFExporter().parseAsync(scene, { binary: true })) as ArrayBuffer;
  writeFileSync(join(outDir, `${name}.glb`), Buffer.from(glb));
  return geometry.getAttribute('position').count / 3;
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const models: ModelManifestV1['models'] = [];

  for (const structure of mockRecords.structures.filter((s) => s.kind === 'pyramid')) {
    const anchor = mockRecords.anchors.find(
      (a) => a.structureSlug === structure.slug && a.kind === 'structure-center'
    );
    const base = measurement(structure.slug, 'base-side-length', 'as_built');
    const height = measurement(structure.slug, 'height', 'as_built');
    if (!anchor || !base || !height) {
      console.warn(`Skipping ${structure.slug}: needs a centre anchor, base and as-built height`);
      continue;
    }
    const seed = [...structure.slug].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

    const variants: {
      condition: 'as_built' | 'surviving';
      params: PyramidParams;
      used: string[];
    }[] = [
      {
        condition: 'as_built',
        params: { baseSide: base.value, height: height.value, casing: true, seed },
        used: [base.slug, height.slug],
      },
    ];
    const surviving = measurement(structure.slug, 'height', 'surviving');
    if (surviving) {
      variants.push({
        condition: 'surviving',
        params: {
          baseSide: base.value,
          height: height.value,
          topHeight: surviving.value,
          casing: false,
          stepHeight: 1.5,
          seed,
        },
        used: [base.slug, height.slug, surviving.slug],
      });
    }

    for (const v of variants) {
      const name = `${structure.slug}-${v.condition.replace('_', '-')}-v${PYRAMID_GENERATOR_VERSION}`;
      const triangles = await exportGlb(v.params, name);
      const used = mockRecords.measurements.filter((m) => v.used.includes(m.slug));
      models.push({
        structureSlug: structure.slug,
        anchorSlug: anchor.slug,
        condition: v.condition,
        file: `/models/${SITE}/${name}.glb`,
        generator: `pyramid v${PYRAMID_GENERATOR_VERSION}`,
        params: { ...v.params },
        measurementSlugs: v.used,
        unverified: anchor.unverified || used.some((m) => m.unverified),
        triangles,
      });
      console.log(`${name}.glb: ${triangles} triangles`);
    }
  }

  const manifest = ModelManifestV1.parse({ v: 1, siteSlug: SITE, models });
  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
