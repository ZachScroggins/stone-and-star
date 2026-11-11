'use client';

import { Html, Line } from '@react-three/drei';
import { useMemo } from 'react';

import { SKY_RADIUS } from './sky';

const DEG = Math.PI / 180;

export interface AnchorMarker {
  slug: string;
  name: string;
  position: [number, number, number];
  /** Height above the anchor where its label floats. */
  labelHeight: number;
  unverified: boolean;
}

export function Labels({
  anchors,
  focus,
  onFocus,
}: {
  anchors: AnchorMarker[];
  focus: string | null;
  onFocus: (slug: string) => void;
}) {
  return (
    <group>
      {anchors.map((a) => (
        <Html
          key={a.slug}
          position={[a.position[0], a.position[1] + a.labelHeight, a.position[2]]}
          center
          zIndexRange={[5, 0]}
        >
          <button
            type="button"
            onClick={() => onFocus(a.slug)}
            aria-pressed={focus === a.slug}
            className="min-h-11 rounded-full px-3 text-sm whitespace-nowrap text-[oklch(0.95_0.02_85)] [text-shadow:0_1px_3px_rgb(0_0_0/0.8)] transition-colors hover:bg-black/30 focus-visible:ring-2 focus-visible:ring-[oklch(0.8_0.12_85)] focus-visible:outline-none aria-pressed:bg-black/40"
          >
            {a.name}
          </button>
        </Html>
      ))}
    </group>
  );
}

export interface DimensionSpec {
  slug: string;
  position: [number, number, number];
  baseSide: number;
  height: number;
  unverified: boolean;
}

function DimensionMarks({ d }: { d: DimensionSpec }) {
  const [x, y, z] = d.position;
  const h = d.baseSide / 2;
  const s = z + h + 12; // just south of the south edge
  const color = '#f2c46d';
  return (
    <group>
      <Line
        points={[
          [x - h, y + 0.5, s],
          [x + h, y + 0.5, s],
        ]}
        color={color}
        lineWidth={1.5}
      />
      <Line
        points={[
          [x - h, y + 0.5, s - 6],
          [x - h, y + 0.5, s + 6],
        ]}
        color={color}
        lineWidth={1.5}
      />
      <Line
        points={[
          [x + h, y + 0.5, s - 6],
          [x + h, y + 0.5, s + 6],
        ]}
        color={color}
        lineWidth={1.5}
      />
      <Line
        points={[
          [x, y, z],
          [x, y + d.height, z],
        ]}
        color={color}
        lineWidth={1}
        dashed
        dashSize={4}
        gapSize={3}
        depthTest={false}
      />
      <Html position={[x, y + 1, s + 10]} center zIndexRange={[5, 0]}>
        <p className="rounded-sm bg-black/55 px-2 py-0.5 text-xs whitespace-nowrap text-[oklch(0.95_0.02_85)] tabular-nums">
          {d.baseSide} m{d.unverified ? ' (unverified)' : ''}
        </p>
      </Html>
      <Html position={[x + 6, y + d.height / 2, z]} zIndexRange={[5, 0]}>
        <p className="rounded-sm bg-black/55 px-2 py-0.5 text-xs whitespace-nowrap text-[oklch(0.95_0.02_85)] tabular-nums">
          {d.height} m{d.unverified ? ' (unverified)' : ''}
        </p>
      </Html>
    </group>
  );
}

export function Dimensions({ items }: { items: DimensionSpec[] }) {
  return (
    <group>
      {items.map((d) => (
        <DimensionMarks key={d.slug} d={d} />
      ))}
    </group>
  );
}

/** Altitude-azimuth grid on the sky dome, with the cardinal points on the horizon. */
export function SkyGrid() {
  const r = SKY_RADIUS * 0.9;
  const lines = useMemo(() => {
    const out: [number, number, number][][] = [];
    for (const alt of [0, 30, 60]) {
      const pts: [number, number, number][] = [];
      for (let az = 0; az <= 360; az += 5) {
        const a = alt * DEG;
        const b = az * DEG;
        pts.push([r * Math.cos(a) * Math.sin(b), r * Math.sin(a), -r * Math.cos(a) * Math.cos(b)]);
      }
      out.push(pts);
    }
    for (let az = 0; az < 360; az += 30) {
      const pts: [number, number, number][] = [];
      for (let alt = 0; alt <= 90; alt += 5) {
        const a = alt * DEG;
        const b = az * DEG;
        pts.push([r * Math.cos(a) * Math.sin(b), r * Math.sin(a), -r * Math.cos(a) * Math.cos(b)]);
      }
      out.push(pts);
    }
    return out;
  }, [r]);

  const cardinals: { label: string; az: number }[] = [
    { label: 'N', az: 0 },
    { label: 'E', az: 90 },
    { label: 'S', az: 180 },
    { label: 'W', az: 270 },
  ];

  return (
    <group renderOrder={-1}>
      {lines.map((pts, i) => (
        <Line
          key={i}
          points={pts}
          color="#e9d7a8"
          transparent
          opacity={i === 0 ? 0.55 : 0.22}
          lineWidth={i === 0 ? 1.2 : 0.8}
          depthWrite={false}
          fog={false}
        />
      ))}
      {cardinals.map((c) => (
        <Html
          key={c.label}
          position={[r * Math.sin(c.az * DEG), r * 0.02, -r * Math.cos(c.az * DEG)]}
          center
          zIndexRange={[5, 0]}
        >
          <span className="font-display text-lg text-[oklch(0.95_0.03_85)] [text-shadow:0_1px_4px_rgb(0_0_0/0.9)]">
            {c.label}
          </span>
        </Html>
      ))}
    </group>
  );
}
