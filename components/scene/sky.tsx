'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, BackSide, Color, type Group, Vector3 } from 'three';

import type { SkyResult, StarAttributes } from './use-sky';

export const SKY_RADIUS = 8000;
const DEG = Math.PI / 180;

/** Scene direction for alt/az (radians): +x east, +y up, −z north. */
export function dirFromAltAz(alt: number, az: number) {
  const c = Math.cos(alt);
  return new Vector3(c * Math.sin(az), Math.sin(alt), -c * Math.cos(az));
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

/** Horizon colour for a solar altitude (degrees); also used for fog. */
export function horizonColor(sunAltDeg: number) {
  const night = new Color(0.006, 0.0075, 0.016);
  const twilight = new Color(0.38, 0.27, 0.26);
  const day = new Color(0.74, 0.79, 0.82);
  const c = night.clone().lerp(twilight, smooth(-18, -4, sunAltDeg));
  return c.lerp(day, smooth(-2, 12, sunAltDeg));
}

/** How much daylight there is, 0 (astronomical night) to 1 (full day). */
export function daylight(sunAltDeg: number) {
  return smooth(-8, 10, sunAltDeg);
}

const domeVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const domeFragment = /* glsl */ `
  uniform vec3 uSunDir;
  uniform float uSunAlt; // degrees
  varying vec3 vDir;

  float sstep(float a, float b, float x) { return smoothstep(a, b, x); }

  void main() {
    vec3 d = normalize(vDir);
    float h = max(d.y, 0.0);
    float day = sstep(-6.0, 8.0, uSunAlt);
    float twi = sstep(-18.0, -5.0, uSunAlt) * (1.0 - sstep(-1.0, 12.0, uSunAlt));

    vec3 nightZenith = vec3(0.0012, 0.0016, 0.0045);
    vec3 nightHorizon = vec3(0.006, 0.0075, 0.016);
    vec3 dayZenith = vec3(0.18, 0.38, 0.70);
    vec3 dayHorizon = vec3(0.70, 0.78, 0.84);

    float t = pow(1.0 - h, 3.0);
    vec3 col = mix(mix(nightZenith, nightHorizon, t), mix(dayZenith, dayHorizon, t), day);

    // Twilight glow towards the Sun's azimuth, strongest low in the sky.
    vec2 flatD = normalize(d.xz + 1e-5);
    vec2 flatS = normalize(uSunDir.xz + 1e-5);
    float toward = pow(max(dot(flatD, flatS), 0.0), 3.0);
    vec3 glow = mix(vec3(0.95, 0.42, 0.18), vec3(0.98, 0.72, 0.45), h);
    col += glow * twi * (0.25 + 0.75 * toward) * exp(-h * 5.0) * 0.8;

    // Sun disc and halo in daylight.
    float cosA = dot(d, normalize(uSunDir));
    col += vec3(1.0, 0.92, 0.78) * pow(max(cosA, 0.0), 900.0) * 6.0 * sstep(-1.0, 1.0, uSunAlt);
    col += vec3(1.0, 0.85, 0.6) * pow(max(cosA, 0.0), 24.0) * 0.25 * day;

    // Below the horizon: a dark ground band so the dome never shows a seam.
    col = mix(col, nightHorizon * 0.6 + dayHorizon * 0.35 * day, sstep(0.0, -0.04, d.y));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

const starVertex = /* glsl */ `
  attribute float aSize;
  attribute float aBright;
  attribute vec3 aColor;
  uniform float uPixelRatio;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec3 dir = normalize(position);
    // Fade towards the horizon (extinction) and hide stars below it.
    vAlpha = aBright * smoothstep(-0.01, 0.06, dir.y);
    vColor = aColor;
    gl_PointSize = aSize * uPixelRatio;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const starFragment = /* glsl */ `
  uniform float uVisibility;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float r = length(p);
    float a = smoothstep(0.5, 0.0, r);
    gl_FragColor = vec4(vColor, a * vAlpha * uVisibility);
    #include <colorspace_fragment>
  }
`;

export function Sky({
  sky,
  stars,
  children,
}: {
  sky: SkyResult | null;
  stars: StarAttributes | null;
  /** Rendered inside the sky group, which follows the camera (grid, cardinal marks). */
  children?: React.ReactNode;
}) {
  const group = useRef<Group>(null);
  const pixelRatio = useThree((s) => s.viewport.dpr);
  const sunAltDeg = sky ? sky.sun.alt / DEG : -30;
  const sunDir = useMemo(
    () => (sky ? dirFromAltAz(sky.sun.alt, sky.sun.az) : new Vector3(0, -1, 0)),
    [sky]
  );
  const fogColor = useMemo(() => horizonColor(sunAltDeg), [sunAltDeg]);

  // Fresh uniform objects per change; three re-uploads them, the programs are reused.
  const domeUniforms = useMemo(
    () => ({ uSunDir: { value: sunDir }, uSunAlt: { value: sunAltDeg } }),
    [sunDir, sunAltDeg]
  );
  const starUniforms = useMemo(
    () => ({
      uVisibility: { value: 1 - smooth(-14, -3, sunAltDeg) },
      uPixelRatio: { value: pixelRatio },
    }),
    [sunAltDeg, pixelRatio]
  );

  const starPositions = useMemo(() => {
    if (!stars || !sky || sky.positions.length !== stars.count * 3) return null;
    const r = SKY_RADIUS * 0.98;
    return sky.positions.map((v) => v * r);
  }, [sky, stars]);

  // Keep the sky centred on the viewer: stars are effectively at infinity.
  useFrame(({ camera }) => {
    group.current?.position.copy(camera.position);
  });

  const moon = sky?.moon;
  const moonDir = moon ? dirFromAltAz(moon.alt, moon.az).multiplyScalar(SKY_RADIUS * 0.95) : null;
  // Illuminated fraction from the phase angle (0 new, 180 full).
  const moonLit = moon ? (1 - Math.cos(moon.phaseDeg * DEG)) / 2 : 0;

  return (
    <group ref={group}>
      <fog attach="fog" args={[fogColor, 2500, 9500]} />
      <color attach="background" args={[fogColor]} />
      <mesh renderOrder={-2} frustumCulled={false}>
        <sphereGeometry args={[SKY_RADIUS, 48, 24]} />
        <shaderMaterial
          vertexShader={domeVertex}
          fragmentShader={domeFragment}
          uniforms={domeUniforms}
          side={BackSide}
          depthWrite={false}
          fog={false}
        />
      </mesh>
      {stars && starPositions ? (
        <points renderOrder={-1} frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[starPositions, 3]} />
            <bufferAttribute attach="attributes-aSize" args={[stars.sizes, 1]} />
            <bufferAttribute attach="attributes-aBright" args={[stars.brightness, 1]} />
            <bufferAttribute attach="attributes-aColor" args={[stars.colors, 3]} />
          </bufferGeometry>
          <shaderMaterial
            vertexShader={starVertex}
            fragmentShader={starFragment}
            uniforms={starUniforms}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
            fog={false}
          />
        </points>
      ) : null}
      {moonDir && moon && moon.alt > -0.02 ? (
        <mesh position={moonDir} renderOrder={-1}>
          {/* Drawn at twice its true 0.5° width so it reads on small screens. */}
          <sphereGeometry args={[SKY_RADIUS * 0.0087, 16, 8]} />
          <meshBasicMaterial
            color={new Color(0.95, 0.93, 0.86).multiplyScalar(0.35 + 0.65 * moonLit)}
            fog={false}
            depthWrite={false}
          />
        </mesh>
      ) : null}
      {children}
    </group>
  );
}
