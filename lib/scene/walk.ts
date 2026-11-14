// First-person walking for the sky view. Pure functions in scene metres
// (+x east, −z north); the camera rig feeds them input and applies the pose.

const DEG = Math.PI / 180;

/** Ground position plus where the viewer looks. Angles in radians. */
export interface WalkPose {
  x: number;
  z: number;
  /** Azimuth: clockwise from north (−z), so π/2 faces east. */
  heading: number;
  /** Above the horizon; negative looks down. */
  pitch: number;
}

/** A structure the viewer cannot walk into: a square footprint, axis-aligned. */
export interface Footprint {
  x: number;
  z: number;
  halfSide: number;
}

export interface WalkWorld {
  footprints: Footprint[];
  /** Walkable square around the scene origin, half side in metres. */
  halfExtent: number;
}

export interface WalkInput {
  /** −1 back … 1 forward. */
  forward: number;
  /** −1 left … 1 right. */
  strafe: number;
  /** −1 turn left … 1 turn right. */
  turn: number;
  fast: boolean;
}

export const WALK_SPEED = 30; // m/s; the plateau is about 1.5 km across
export const FAST_FACTOR = 4;
export const TURN_SPEED = 60 * DEG; // rad/s
export const PITCH_MIN = -30 * DEG;
export const PITCH_MAX = 88 * DEG;
/** Keeps the eye this far outside a footprint, so the camera never clips a wall. */
export const FOOTPRINT_MARGIN = 6;

export const clampPitch = (p: number) => Math.min(PITCH_MAX, Math.max(PITCH_MIN, p));
export const wrapHeading = (h: number) => ((h % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

/** Horizontal unit vector the viewer faces: [x, z]. */
export function facing(heading: number): [number, number] {
  return [Math.sin(heading), -Math.cos(heading)];
}

/** Pushes a point out of every footprint (nearest edge) and back inside the walkable square. */
export function constrain(x: number, z: number, world: WalkWorld): [number, number] {
  let px = x;
  let pz = z;
  for (const f of world.footprints) {
    const h = f.halfSide + FOOTPRINT_MARGIN;
    const dx = px - f.x;
    const dz = pz - f.z;
    if (Math.abs(dx) >= h || Math.abs(dz) >= h) continue;
    // Inside: leave through the nearest side.
    if (h - Math.abs(dx) < h - Math.abs(dz)) px = f.x + Math.sign(dx || 1) * h;
    else pz = f.z + Math.sign(dz || 1) * h;
  }
  const e = world.halfExtent;
  return [Math.min(e, Math.max(-e, px)), Math.min(e, Math.max(-e, pz))];
}

/**
 * Moves the pose by `dt` seconds of held input plus an instant step of `stepMetres`
 * along the facing direction (scroll wheel or pinch).
 */
export function stepWalk(
  pose: WalkPose,
  input: WalkInput,
  dt: number,
  world: WalkWorld,
  stepMetres = 0
): WalkPose {
  const heading = wrapHeading(pose.heading + input.turn * TURN_SPEED * dt);
  const [fx, fz] = facing(heading);
  // Right-hand vector: facing rotated 90° clockwise seen from above.
  const rx = -fz;
  const rz = fx;
  const speed = WALK_SPEED * (input.fast ? FAST_FACTOR : 1) * dt;
  const len = Math.hypot(input.forward, input.strafe);
  const k = len > 1 ? 1 / len : 1;
  const along = input.forward * k * speed + stepMetres;
  const side = input.strafe * k * speed;
  const [x, z] = constrain(pose.x + fx * along + rx * side, pose.z + fz * along + rz * side, world);
  return { x, z, heading, pitch: pose.pitch };
}

/** Distance (m), compass bearing (degrees) and elevation angle (degrees) from an eye to a point. */
export function sightTo(
  eye: [number, number, number],
  point: [number, number, number]
): { distance: number; bearingDeg: number; elevationDeg: number } {
  const dx = point[0] - eye[0];
  const dy = point[1] - eye[1];
  const dz = point[2] - eye[2];
  const ground = Math.hypot(dx, dz);
  return {
    distance: ground,
    bearingDeg: wrapHeading(Math.atan2(dx, -dz)) / DEG,
    elevationDeg: Math.atan2(dy, ground) / DEG,
  };
}
