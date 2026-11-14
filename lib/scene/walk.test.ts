import { describe, expect, it } from 'vitest';

import {
  constrain,
  FOOTPRINT_MARGIN,
  sightTo,
  stepWalk,
  WALK_SPEED,
  type WalkInput,
  type WalkWorld,
} from './walk';

const DEG = Math.PI / 180;
const world: WalkWorld = { footprints: [{ x: 0, z: 0, halfSide: 100 }], halfExtent: 2000 };
const still: WalkInput = { forward: 0, strafe: 0, turn: 0, fast: false };

describe('stepWalk', () => {
  it('walks north at heading 0 and east at heading 90°', () => {
    const north = stepWalk(
      { x: 500, z: 500, heading: 0, pitch: 0 },
      { ...still, forward: 1 },
      1,
      world
    );
    expect(north.x).toBeCloseTo(500);
    expect(north.z).toBeCloseTo(500 - WALK_SPEED);
    const east = stepWalk(
      { x: 500, z: 500, heading: 90 * DEG, pitch: 0 },
      { ...still, forward: 1 },
      1,
      world
    );
    expect(east.x).toBeCloseTo(500 + WALK_SPEED);
    expect(east.z).toBeCloseTo(500);
  });

  it('strafes right of the facing direction and keeps diagonal speed', () => {
    const p = stepWalk({ x: 500, z: 500, heading: 0, pitch: 0 }, { ...still, strafe: 1 }, 1, world);
    expect(p.x).toBeCloseTo(500 + WALK_SPEED);
    const d = stepWalk(
      { x: 500, z: 500, heading: 0, pitch: 0 },
      { ...still, forward: 1, strafe: 1 },
      1,
      world
    );
    expect(Math.hypot(d.x - 500, d.z - 500)).toBeCloseTo(WALK_SPEED);
  });

  it('turns and wraps the heading', () => {
    const p = stepWalk({ x: 500, z: 500, heading: 0, pitch: 0 }, { ...still, turn: -1 }, 1, world);
    expect(p.heading).toBeCloseTo(300 * DEG);
  });

  it('applies a scroll step along the facing direction', () => {
    const p = stepWalk({ x: 500, z: 500, heading: 180 * DEG, pitch: 0.3 }, still, 0, world, 25);
    expect(p.z).toBeCloseTo(525);
    expect(p.pitch).toBe(0.3);
  });

  it('stops at a footprint instead of walking into it', () => {
    const p = stepWalk({ x: 0, z: 150, heading: 0, pitch: 0 }, { ...still, forward: 1 }, 2, world);
    expect(p.z).toBeCloseTo(100 + FOOTPRINT_MARGIN);
  });
});

describe('constrain', () => {
  it('leaves through the nearest side', () => {
    expect(constrain(90, 10, world)).toEqual([100 + FOOTPRINT_MARGIN, 10]);
    expect(constrain(-5, -95, world)).toEqual([-5, -100 - FOOTPRINT_MARGIN]);
  });

  it('keeps the viewer on the terrain', () => {
    expect(constrain(5000, -5000, world)).toEqual([2000, -2000]);
  });
});

describe('sightTo', () => {
  it('gives distance, bearing and elevation', () => {
    const s = sightTo([0, 0, 0], [-100, 100, -100]);
    expect(s.distance).toBeCloseTo(141.42, 1);
    expect(s.bearingDeg).toBeCloseTo(315);
    expect(s.elevationDeg).toBeCloseTo(35.26, 1);
  });
});
