'use client';

import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Color, PCFShadowMap, Vector3, type DirectionalLight, type PerspectiveCamera } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

import type { TerrainV1 } from '@/lib/scene/terrain';

import { Dimensions, Labels, SkyGrid, type AnchorMarker, type DimensionSpec } from './overlays';
import { Sky, daylight, dirFromAltAz, horizonColor } from './sky';
import { Structures, type PlacedModel } from './structures';
import { Terrain } from './terrain';
import type { SkyResult, StarAttributes } from './use-sky';

const DEG = Math.PI / 180;

export interface SceneCanvasProps {
  terrain: TerrainV1;
  heights: Float32Array;
  models: PlacedModel[];
  anchors: AnchorMarker[];
  dimensions: DimensionSpec[];
  sky: SkyResult | null;
  stars: StarAttributes | null;
  layers: { labels: boolean; dimensions: boolean; skyDome: boolean };
  focusTarget: [number, number, number];
  view: 'overview' | 'sky';
  /** Where the viewer stands in sky view (scene metres, eye height included). */
  skyEye: [number, number, number];
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

const OVERVIEW_FOV = 45;
const SKY_FOV = 70;

/**
 * Drives the camera. Overview: orbit, easing the target to the focused anchor.
 * Sky: stand at eye height on the plateau; dragging turns the head (the orbit
 * target sits 1 m in front of the eye).
 */
function CameraRig({
  view,
  target,
  eye,
}: {
  view: 'overview' | 'sky';
  target: [number, number, number];
  eye: [number, number, number];
}) {
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const goal = useMemo(() => new Vector3(...target), [target]);
  const eyePos = useMemo(() => new Vector3(...eye), [eye]);
  const pending = useRef<'init' | 'focus' | 'enter-sky' | 'leave-sky' | null>('init');
  const saved = useRef<{ position: Vector3; target: Vector3 } | null>(null);
  // The camera always starts in overview, so a link that opens in sky view still enters it.
  const lastView = useRef<'overview' | 'sky'>('overview');

  useEffect(() => {
    // Until the first frame has placed the camera ('init'), only record the view.
    const initializing = pending.current === 'init';
    if (lastView.current !== view) {
      lastView.current = view;
      if (!initializing) pending.current = view === 'sky' ? 'enter-sky' : 'leave-sky';
    } else if (view === 'overview' && !initializing) {
      pending.current = 'focus';
    }
  }, [goal, view]);

  useFrame(({ camera }, delta) => {
    if (!controls || !pending.current) return;
    const cam = camera as PerspectiveCamera;
    if (pending.current === 'init') {
      controls.target.copy(goal);
      // Portrait screens see a narrow slice; step back so the three pyramids fit.
      if (cam.aspect < 1) {
        const back = cam.position
          .clone()
          .sub(controls.target)
          .multiplyScalar(1 / cam.aspect - 1);
        cam.position.add(back.multiplyScalar(1.1));
      }
      pending.current = lastView.current === 'sky' ? 'enter-sky' : 'focus';
      return;
    }
    if (pending.current === 'enter-sky') {
      saved.current = { position: cam.position.clone(), target: controls.target.clone() };
      cam.position.copy(eyePos);
      // Face the pyramids (north-west), tilted up 25°.
      const look = new Vector3(-0.6, 0.47, -0.65).normalize();
      controls.target.copy(eyePos).add(look);
      cam.fov = SKY_FOV;
      cam.updateProjectionMatrix();
      controls.update();
      pending.current = null;
      return;
    }
    if (pending.current === 'leave-sky') {
      if (saved.current) {
        cam.position.copy(saved.current.position);
        controls.target.copy(saved.current.target);
      }
      cam.fov = OVERVIEW_FOV;
      cam.updateProjectionMatrix();
      controls.update();
      pending.current = 'focus';
      return;
    }
    // Ease towards the focus target; the camera keeps its offset.
    const step = goal
      .clone()
      .sub(controls.target)
      .multiplyScalar(1 - Math.exp(-delta * 3));
    controls.target.add(step);
    cam.position.add(step);
    controls.update();
    if (goal.distanceTo(controls.target) < 0.5) pending.current = null;
  });
  return null;
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
        </Sky>
        <Lights sky={props.sky} />
        <Terrain terrain={props.terrain} heights={props.heights} />
        <Structures models={props.models} highlights={props.highlights} />
        {layers.labels ? (
          <Labels anchors={props.anchors} focus={props.focus} onFocus={props.onFocus} />
        ) : null}
        {layers.dimensions ? <Dimensions items={props.dimensions} /> : null}
      </Suspense>
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enableZoom={!(props.view === 'sky')}
        enablePan={!(props.view === 'sky')}
        rotateSpeed={props.view === 'sky' ? -0.35 : 1}
        minDistance={props.view === 'sky' ? 1 : 40}
        maxDistance={props.view === 'sky' ? 1 : 6000}
        minPolarAngle={props.view === 'sky' ? 2 * DEG : 0}
        maxPolarAngle={props.view === 'sky' ? 178 * DEG : 88 * DEG}
        zoomSpeed={0.8}
      />
      <CameraRig view={props.view} target={props.focusTarget} eye={props.skyEye} />
    </Canvas>
  );
}
