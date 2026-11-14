'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Vector3, type PerspectiveCamera } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

import {
  clampPitch,
  stepWalk,
  wrapHeading,
  type WalkInput,
  type WalkPose,
  type WalkWorld,
} from '@/lib/scene/walk';

import { padWalkInput, releasePad } from './walk-pad';

export const OVERVIEW_FOV = 45;
export const SKY_FOV = 70;
const EYE_HEIGHT = 1.7;
/** Movement settles for this long before the standpoint is written to the store. */
const COMMIT_DELAY_MS = 300;
/** Metres per wheel pixel and per pinch pixel. */
const WHEEL_METRES = 0.25;
const PINCH_METRES = 1;
const MAX_STEP = 80;

/** Key codes (layout-independent) to held walk inputs. */
const keyMap: [string[], string][] = [
  [['KeyW', 'ArrowUp'], 'forward+'],
  [['KeyS', 'ArrowDown'], 'forward-'],
  [['KeyA'], 'strafe-'],
  [['KeyD'], 'strafe+'],
  [['KeyQ', 'ArrowLeft'], 'turn-'],
  [['KeyE', 'ArrowRight'], 'turn+'],
];

/** Keys go to the walker unless the user is typing or working a control. */
function keyTargetIsFree(target: EventTarget | null) {
  if (!(target instanceof Element)) return true;
  return !target.closest(
    'input, textarea, select, [contenteditable="true"], [role="slider"], [role="textbox"], [role="combobox"], [role="spinbutton"]'
  );
}

function samePose(a: WalkPose, b: WalkPose) {
  const dh = Math.abs(wrapHeading(a.heading - b.heading + Math.PI) - Math.PI);
  return Math.hypot(a.x - b.x, a.z - b.z) < 0.5 && dh < 0.01 && Math.abs(a.pitch - b.pitch) < 0.01;
}

/**
 * Drives the camera.
 * Overview: OrbitControls orbit the site; the target eases to the focused anchor.
 * Sky: OrbitControls are off and the viewer walks at eye height (keys, pad, wheel,
 * pinch) and drags to look. The overview pose is recorded every overview frame and
 * restored on the way back, so a view switch never inherits a sky-view camera.
 */
export function CameraRig({
  view,
  target,
  standpoint,
  world,
  groundAt,
  onStandpoint,
}: {
  view: 'overview' | 'sky';
  target: [number, number, number];
  /** Sky-view pose from the scene store (or the site default). */
  standpoint: WalkPose;
  world: WalkWorld;
  groundAt: (x: number, z: number) => number;
  onStandpoint: (pose: WalkPose) => void;
}) {
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const element = useThree((s) => s.gl.domElement);
  const goal = useMemo(() => new Vector3(...target), [target]);

  const mode = useRef<'init' | 'overview' | 'sky'>('init');
  const easing = useRef(false);
  const overview = useRef({ position: new Vector3(), target: new Vector3(), saved: false });
  const pose = useRef<WalkPose>({ ...standpoint });
  const committed = useRef<WalkPose>({ ...standpoint });
  const dirtySince = useRef<number | null>(null);
  const pendingStep = useRef(0);
  const keys = useRef(new Set<string>());

  // A new focus target: ease towards it (overview only; sky view keeps its standpoint).
  useEffect(() => {
    if (mode.current === 'overview') easing.current = true;
  }, [goal]);

  // The store's standpoint changed from outside (URL, reset, guide): jump there.
  useEffect(() => {
    if (samePose(standpoint, committed.current)) return;
    pose.current = { ...standpoint };
    committed.current = { ...standpoint };
    pendingStep.current = 0;
    dirtySince.current = null;
  }, [standpoint]);

  // Sky-view input: keys, drag to look, wheel and pinch to step.
  useEffect(() => {
    if (view !== 'sky') return;
    const markDirty = () => {
      dirtySince.current = performance.now();
    };
    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        if (down) keys.current.add('fast');
        else keys.current.delete('fast');
        return;
      }
      const hit = keyMap.find(([codes]) => codes.includes(e.code));
      if (!hit) return;
      if (down && (!keyTargetIsFree(e.target) || e.metaKey || e.ctrlKey || e.altKey)) return;
      e.preventDefault();
      if (down) keys.current.add(hit[1]);
      else keys.current.delete(hit[1]);
    };
    const keyDown = onKey(true);
    const keyUp = onKey(false);
    const clearKeys = () => {
      keys.current.clear();
      releasePad();
    };

    const pointers = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    const spread = () => {
      const [a, b] = [...pointers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      element.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) pinch = spread();
    };
    const onMove = (e: PointerEvent) => {
      const last = pointers.get(e.pointerId);
      if (!last) return;
      // A release can go missing (outside the window, devtools); never drag without a button.
      if (e.pointerType === 'mouse' && e.buttons === 0) {
        pointers.delete(e.pointerId);
        return;
      }
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        // Grab the sky: what is under the pointer follows it.
        const k = (SKY_FOV * (Math.PI / 180)) / Math.max(1, element.clientHeight);
        pose.current = {
          ...pose.current,
          heading: wrapHeading(pose.current.heading - dx * k),
          pitch: clampPitch(pose.current.pitch + dy * k),
        };
        markDirty();
      } else if (pointers.size === 2) {
        const d = spread();
        pendingStep.current = Math.max(
          -MAX_STEP,
          Math.min(MAX_STEP, pendingStep.current + (d - pinch) * PINCH_METRES)
        );
        pinch = d;
      }
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 2) pinch = spread();
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const px = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
      pendingStep.current = Math.max(
        -MAX_STEP,
        Math.min(MAX_STEP, pendingStep.current - px * WHEEL_METRES)
      );
    };

    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', clearKeys);
    element.addEventListener('pointerdown', onDown);
    element.addEventListener('pointermove', onMove);
    element.addEventListener('pointerup', onUp);
    element.addEventListener('pointercancel', onUp);
    element.addEventListener('lostpointercapture', onUp);
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', clearKeys);
      element.removeEventListener('pointerdown', onDown);
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerup', onUp);
      element.removeEventListener('pointercancel', onUp);
      element.removeEventListener('lostpointercapture', onUp);
      element.removeEventListener('wheel', onWheel);
      clearKeys();
    };
  }, [view, element]);

  useFrame(({ camera }, delta) => {
    if (!controls) return;
    const cam = camera as PerspectiveCamera;
    const dt = Math.min(delta, 0.1);

    if (mode.current === 'init') {
      controls.target.copy(goal);
      // Portrait screens see a narrow slice; step back so the three pyramids fit.
      if (cam.aspect < 1) {
        const back = cam.position
          .clone()
          .sub(controls.target)
          .multiplyScalar(1 / cam.aspect - 1);
        cam.position.add(back.multiplyScalar(1.1));
      }
      controls.update();
      mode.current = 'overview';
      // Record it now: a link that opens in sky view never runs an overview frame first.
      overview.current.position.copy(cam.position);
      overview.current.target.copy(controls.target);
      overview.current.saved = true;
    }

    if (view === 'sky') {
      if (mode.current !== 'sky') {
        mode.current = 'sky';
        cam.fov = SKY_FOV;
        cam.updateProjectionMatrix();
      }
      const k = keys.current;
      const pad = padWalkInput();
      const has = (key: string) => (k.has(key) ? 1 : 0);
      const input: WalkInput = {
        forward: Math.max(-1, Math.min(1, has('forward+') - has('forward-') + pad.forward)),
        strafe: has('strafe+') - has('strafe-'),
        turn: Math.max(-1, Math.min(1, has('turn+') - has('turn-') + pad.turn)),
        fast: k.has('fast'),
      };
      // Wheel and pinch steps glide in over a few frames.
      let step = 0;
      if (pendingStep.current !== 0) {
        step = pendingStep.current * (1 - Math.exp(-dt * 12));
        if (Math.abs(pendingStep.current - step) < 0.05) step = pendingStep.current;
        pendingStep.current -= step;
      }
      if (input.forward || input.strafe || input.turn || step) {
        pose.current = stepWalk(pose.current, input, dt, world, step);
        dirtySince.current = performance.now();
      }
      const p = pose.current;
      cam.position.set(p.x, groundAt(p.x, p.z) + EYE_HEIGHT, p.z);
      cam.rotation.set(p.pitch, -p.heading, 0, 'YXZ');

      if (dirtySince.current !== null && performance.now() - dirtySince.current > COMMIT_DELAY_MS) {
        dirtySince.current = null;
        committed.current = { ...p };
        onStandpoint({ ...p });
      }
      return;
    }

    if (mode.current === 'sky') {
      // Back to the overview: restore the last overview pose.
      mode.current = 'overview';
      const o = overview.current;
      if (o.saved) {
        cam.position.copy(o.position);
        controls.target.copy(o.target);
      }
      cam.fov = OVERVIEW_FOV;
      cam.updateProjectionMatrix();
      controls.update();
      easing.current = true;
    }

    if (easing.current) {
      // Ease towards the focus target; the camera keeps its offset.
      const stepV = goal
        .clone()
        .sub(controls.target)
        .multiplyScalar(1 - Math.exp(-dt * 3));
      controls.target.add(stepV);
      cam.position.add(stepV);
      controls.update();
      if (goal.distanceTo(controls.target) < 0.5) easing.current = false;
    }

    const o = overview.current;
    o.position.copy(cam.position);
    o.target.copy(controls.target);
    o.saved = true;
  });
  return null;
}
