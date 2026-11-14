'use client';

import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useRef } from 'react';
import {
  Color,
  PCFShadowMap,
  Vector3,
  getConsoleFunction,
  setConsoleFunction,
  type DirectionalLight,
} from 'three';

import type { SkyFiguresV1 } from '@/lib/astro/constellations';
import type { TerrainV1 } from '@/lib/scene/terrain';
import type { WalkPose, WalkWorld } from '@/lib/scene/walk';

import { CameraRig, OVERVIEW_FOV } from './camera-rig';
import { Constellations } from './constellations';
import { Dimensions, Labels, SkyGrid, type AnchorMarker, type DimensionSpec } from './overlays';
import { Sky, daylight, dirFromAltAz, horizonColor, starVisibility } from './sky';
import { Structures, type PlacedModel } from './structures';
import { Terrain } from './terrain';
import type { SkyResult, StarAttributes } from './use-sky';

const DEG = Math.PI / 180;

// @react-three/fiber 9 still creates a THREE.Clock, which three r183+ flags as
// deprecated on every canvas. Drop that one message and pass everything else on.
// Remove once fiber ships its Timer-based store (v10).
if (!getConsoleFunction()) {
  setConsoleFunction((method: 'log' | 'warn' | 'error', message: string, ...params: unknown[]) => {
    if (method === 'warn' && message.startsWith('THREE.Clock:')) return;
    console[method](message, ...params);
  });
}

export interface SceneCanvasProps {
  terrain: TerrainV1;
  heights: Float32Array;
  models: PlacedModel[];
  anchors: AnchorMarker[];
  dimensions: DimensionSpec[];
  sky: SkyResult | null;
  stars: StarAttributes | null;
  constellations: SkyFiguresV1 | null;
  layers: { labels: boolean; dimensions: boolean; skyDome: boolean; constellations: boolean };
  focusTarget: [number, number, number];
  view: 'overview' | 'sky';
  /** Where the viewer stands and looks in sky view (scene metres, radians). */
  standpoint: WalkPose;
  walkWorld: WalkWorld;
  groundAt: (x: number, z: number) => number;
  onStandpoint: (pose: WalkPose) => void;
  focus: string | null;
  highlights: string[];
  onFocus: (slug: string) => void;
}

function Lights({ sky }: { sky: SkyResult | null }) {
  const sun = useRef<DirectionalLight>(null);
  const sunAltDeg = sky ? sky.sun.alt / DEG : -30;
  const day = daylight(sunAltDeg);
  const sunDir = sky ? dirFromAltAz(sky.sun.alt, sky.sun.az) : new Vector3(0, -1, 0);
  const moonDir = sky ? dirFromAltAz(sky.moon.alt, sky.moon.az) : new Vector3(0, -1, 0);
  const moonLit = sky ? (1 - Math.cos(sky.moon.phaseDeg * DEG)) / 2 : 0;
  const moonUp = sky && sky.moon.alt > 0 ? Math.min(1, sky.moon.alt / (10 * DEG)) : 0;

  // Low sun warms toward amber; high sun is near white.
  const sunColor = new Color(1, 0.62, 0.35).lerp(
    new Color(1, 0.96, 0.9),
    Math.min(1, Math.max(0, sunAltDeg / 25))
  );
  const sunUp = Math.min(1, Math.max(0, (sunAltDeg + 1) / 6));
  const sky0 = horizonColor(sunAltDeg);

  useEffect(() => {
    sun.current?.target.updateMatrixWorld();
  });

  return (
    <>
      <hemisphereLight args={[sky0, new Color(0.45, 0.36, 0.25), 0.9 * day]} />
      {/* Starlight floor: keeps the plateau legible on a moonless night. */}
      <hemisphereLight
        args={[new Color(0.35, 0.42, 0.65), new Color(0.12, 0.1, 0.08), 0.45 * (1 - day)]}
      />
      <directionalLight
        ref={sun}
        position={sunDir.clone().multiplyScalar(3000).toArray()}
        intensity={2.6 * sunUp}
        color={sunColor}
        castShadow={sunUp > 0}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-1400}
        shadow-camera-right={1400}
        shadow-camera-top={1400}
        shadow-camera-bottom={-1400}
        shadow-camera-near={100}
        shadow-camera-far={7000}
        shadow-bias={-0.0004}
        shadow-normalBias={1.5}
      />
      <directionalLight
        position={moonDir.clone().multiplyScalar(3000).toArray()}
        intensity={0.35 * moonLit * moonUp * (1 - day)}
        color={new Color(0.7, 0.78, 1)}
      />
    </>
  );
}

export default function SceneCanvas(props: SceneCanvasProps) {
  const { layers } = props;
  return (
    <Canvas
      shadows={{ type: PCFShadowMap }}
      dpr={[1, 1.75]}
      camera={{ position: [450, 230, 1350], fov: OVERVIEW_FOV, near: 0.5, far: 30000 }}
      gl={{ antialias: true }}
      className="touch-none"
    >
      <Suspense fallback={null}>
        <Sky sky={props.sky} stars={props.stars}>
          {layers.skyDome ? <SkyGrid /> : null}
          {layers.constellations && props.sky && props.stars && props.constellations ? (
            <Constellations
              sky={props.sky}
              stars={props.stars}
              figures={props.constellations}
              visibility={Math.max(0.35, starVisibility(props.sky.sun.alt / DEG))}
            />
          ) : null}
        </Sky>
        <Lights sky={props.sky} />
        <Terrain terrain={props.terrain} heights={props.heights} />
        <Structures models={props.models} highlights={props.highlights} />
        {layers.labels ? (
          <Labels anchors={props.anchors} focus={props.focus} onFocus={props.onFocus} />
        ) : null}
        {layers.dimensions ? <Dimensions items={props.dimensions} /> : null}
      </Suspense>
      {/* Overview only. Sky view walks with its own input (see CameraRig). */}
      <OrbitControls
        makeDefault
        enabled={props.view === 'overview'}
        enableDamping
        dampingFactor={0.08}
        minDistance={40}
        maxDistance={6000}
        maxPolarAngle={88 * DEG}
        zoomSpeed={0.8}
      />
      <CameraRig
        view={props.view}
        target={props.focusTarget}
        standpoint={props.standpoint}
        world={props.walkWorld}
        groundAt={props.groundAt}
        onStandpoint={props.onStandpoint}
      />
    </Canvas>
  );
}
