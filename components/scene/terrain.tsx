'use client';

import { useEffect, useMemo } from 'react';
import { BufferAttribute, BufferGeometry, Float32BufferAttribute, PlaneGeometry } from 'three';

import type { TerrainV1 } from '@/lib/scene/terrain';

// Sand and limestone (sRGB), graded by slope and height. Matte, no photo textures.
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const SAND = [0.78, 0.66, 0.48];
const ROCK = [0.62, 0.52, 0.4];
const LOW = [0.6, 0.55, 0.42];

export function Terrain({ terrain, heights }: { terrain: TerrainV1; heights: Float32Array }) {
  const extent = (terrain.size - 1) * terrain.spacingM;

  const geometry = useMemo(() => {
    const g = new PlaneGeometry(extent, extent, terrain.size - 1, terrain.size - 1);
    // Plane rows run from +y (north) to −y; rotating −90° about x maps +y to −z (north).
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, heights[i]);
    g.computeVertexNormals();

    const normals = g.attributes.normal as BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    let seed = 1;
    const noise = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647 - 0.5;
    };
    for (let i = 0; i < pos.count; i++) {
      const steep = 1 - normals.getY(i);
      const rock = Math.min(1, steep * 6);
      const low = Math.min(1, Math.max(0, (-pos.getY(i) - 15) / 25));
      const n = 1 + noise() * 0.05;
      for (let c = 0; c < 3; c++) {
        const base = SAND[c] * (1 - rock) + ROCK[c] * rock;
        colors[i * 3 + c] = toLinear((base * (1 - low) + LOW[c] * low) * n);
      }
    }
    g.setAttribute('color', new BufferAttribute(colors, 3));
    return g;
  }, [extent, terrain.size, heights]);

  // Beyond the heightmap: a skirt that carries each edge height straight out to a
  // far square, so the horizon reads as open desert and valley, not a cliff edge.
  // Fog hides where it ends.
  const apron = useMemo(() => {
    const n = terrain.size;
    const half = extent / 2;
    const far = 14000;
    const perimeter: number[] = [];
    for (let c = 0; c < n - 1; c++) perimeter.push(c); // north edge, west → east
    for (let r = 0; r < n - 1; r++) perimeter.push(r * n + n - 1); // east edge, north → south
    for (let c = n - 1; c > 0; c--) perimeter.push((n - 1) * n + c); // south edge, east → west
    for (let r = n - 1; r > 0; r--) perimeter.push(r * n); // west edge, south → north
    const positions: number[] = [];
    for (const idx of perimeter) {
      const r = Math.floor(idx / n);
      const c = idx % n;
      const x = -half + c * terrain.spacingM;
      const z = -half + r * terrain.spacingM;
      const k = far / Math.max(Math.abs(x), Math.abs(z));
      positions.push(x, heights[idx], z, x * k, heights[idx], z * k);
    }
    const indices: number[] = [];
    const m = perimeter.length;
    for (let i = 0; i < m; i++) {
      const a = i * 2;
      const b = ((i + 1) % m) * 2;
      // Perimeter runs clockwise seen from above; wind so faces point up.
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(positions, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }, [extent, heights, terrain]);

  useEffect(
    () => () => {
      geometry.dispose();
      apron.dispose();
    },
    [geometry, apron]
  );

  return (
    <group>
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial vertexColors roughness={1} metalness={0} />
      </mesh>
      <mesh geometry={apron} receiveShadow>
        <meshStandardMaterial color="#c2a87f" roughness={1} metalness={0} />
      </mesh>
    </group>
  );
}
