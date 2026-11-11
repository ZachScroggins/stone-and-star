'use client';

import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import { type Mesh, type Object3D } from 'three';

import type { ModelManifestV1 } from '@/lib/models/manifest';

export interface PlacedModel {
  model: ModelManifestV1['models'][number];
  position: [number, number, number];
}

function Model({ placed, highlighted }: { placed: PlacedModel; highlighted: boolean }) {
  const { scene } = useGLTF(placed.model.file);
  const object = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((o: Object3D) => {
      const mesh = o as Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  return (
    <group position={placed.position}>
      <primitive object={object} />
      {highlighted ? (
        <mesh position={[0, 0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry
            args={[
              Number(placed.model.params.baseSide) * 0.8,
              Number(placed.model.params.baseSide) * 0.84,
              4,
              1,
              Math.PI / 4,
            ]}
          />
          <meshBasicMaterial color="#f2c46d" transparent opacity={0.85} />
        </mesh>
      ) : null}
    </group>
  );
}

export function Structures({
  models,
  highlights,
}: {
  models: PlacedModel[];
  highlights: string[];
}) {
  return (
    <group>
      {models.map((m) => (
        <Model
          key={m.model.file}
          placed={m}
          highlighted={
            highlights.includes(m.model.structureSlug) || highlights.includes(m.model.anchorSlug)
          }
        />
      ))}
    </group>
  );
}
