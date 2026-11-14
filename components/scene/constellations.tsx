'use client';

import { Html, Line } from '@react-three/drei';
import { useMemo } from 'react';

import { figureSegments, type ConstellationSetV1 } from '@/lib/astro/constellations';

import { SKY_RADIUS } from './sky';
import type { SkyResult, StarAttributes } from './use-sky';

type V3 = [number, number, number];

const R = SKY_RADIUS * 0.97;
/** Lines stop this far (radians) short of each star, so the stars stay visible. */
const STAR_GAP = 0.6 * (Math.PI / 180);
/** Lines are cut at this height above the horizon (unit-vector y, about 0.5°). */
const HORIZON_Y = 0.009;
/** Labels show once the figure's centre is this high (about 3°). */
const LABEL_MIN_Y = 0.05;

function normalize(v: V3): V3 {
  const m = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / m, v[1] / m, v[2] / m];
}

const lerp = (a: V3, b: V3, t: number): V3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/**
 * Trims a segment between two unit directions so it starts and ends a little
 * short of the stars, and clips it at the horizon. Null when nothing is above it.
 */
function visiblePart(a: V3, b: V3): [V3, V3] | null {
  const angle = Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
  if (angle > 3 * STAR_GAP) {
    const t = STAR_GAP / angle;
    [a, b] = [normalize(lerp(a, b, t)), normalize(lerp(a, b, 1 - t))];
  }
  const ay = a[1] - HORIZON_Y;
  const by = b[1] - HORIZON_Y;
  if (ay < 0 && by < 0) return null;
  if (ay < 0) a = normalize(lerp(a, b, ay / (ay - by)));
  else if (by < 0) b = normalize(lerp(b, a, by / (by - ay)));
  return [a, b];
}

/**
 * Zodiac stick figures and names on the sky dome. Rendered inside the Sky group,
 * which follows the camera, so directions only need scaling to the dome radius.
 */
export function Constellations({
  sky,
  stars,
  figures,
  visibility,
}: {
  sky: SkyResult;
  stars: StarAttributes;
  figures: ConstellationSetV1;
  /** 0–1: fades the figures in daylight. */
  visibility: number;
}) {
  // Catalog index pairs per figure (positions are in catalog order).
  const indexed = useMemo(() => {
    const index = new Map<number, number>();
    stars.hip.forEach((hip, i) => index.set(hip, i));
    return figures.constellations.map((c) => ({
      abbr: c.abbr,
      name: c.name,
      english: c.english,
      pairs: figureSegments(c).flatMap(([a, b]) => {
        const ia = index.get(a);
        const ib = index.get(b);
        return ia === undefined || ib === undefined ? [] : [[ia, ib] as const];
      }),
      members: [...new Set(c.lines.flat())].flatMap((h) => index.get(h) ?? []),
    }));
  }, [figures, stars]);

  const { points, labels } = useMemo(() => {
    const p = sky.positions;
    const dir = (i: number): V3 => [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]];
    const pts: V3[] = [];
    const lbl: { abbr: string; name: string; english: string; position: V3 }[] = [];
    for (const fig of indexed) {
      for (const [ia, ib] of fig.pairs) {
        const seg = visiblePart(dir(ia), dir(ib));
        if (!seg) continue;
        pts.push(
          [seg[0][0] * R, seg[0][1] * R, seg[0][2] * R],
          [seg[1][0] * R, seg[1][1] * R, seg[1][2] * R]
        );
      }
      const sum: V3 = [0, 0, 0];
      for (const i of fig.members) {
        sum[0] += p[i * 3];
        sum[1] += p[i * 3 + 1];
        sum[2] += p[i * 3 + 2];
      }
      const c = normalize(sum);
      if (c[1] > LABEL_MIN_Y) {
        // Just below the figure's centre, so the name does not cover its brightest stars.
        const below = normalize([c[0], c[1] - 0.035, c[2]]);
        lbl.push({
          abbr: fig.abbr,
          name: fig.name,
          english: fig.english,
          position: [below[0] * R, below[1] * R, below[2] * R],
        });
      }
    }
    return { points: pts, labels: lbl };
  }, [sky, indexed]);

  if (visibility <= 0.01) return null;

  return (
    <group>
      {points.length > 0 ? (
        <Line
          points={points}
          segments
          color="#a9c2ff"
          lineWidth={1.25}
          transparent
          opacity={0.6 * visibility}
          depthWrite={false}
          fog={false}
          renderOrder={-1}
        />
      ) : null}
      {labels.map((l) => (
        // Click-through: drags and wheel steps over a name still reach the canvas.
        <Html
          key={l.abbr}
          position={l.position}
          center
          zIndexRange={[4, 0]}
          pointerEvents="none"
          style={{ pointerEvents: 'none' }}
        >
          <span
            title={l.english}
            style={{ opacity: Math.max(0.35, visibility) }}
            className="pointer-events-none font-display text-sm tracking-[0.08em] whitespace-nowrap text-[oklch(0.88_0.05_255)] select-none [text-shadow:0_1px_4px_rgb(0_0_0/0.9)]"
          >
            {l.name}
          </span>
        </Html>
      ))}
    </group>
  );
}
