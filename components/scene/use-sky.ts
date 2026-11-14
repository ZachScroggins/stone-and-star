'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { STAR_CATALOG_URL, StarCatalogV1 } from '@/lib/astro/catalog';
import type { SkyInput } from '@/lib/astro/sky';

export interface SkyResult {
  /** Unit directions per star, scene axes, catalog order. */
  positions: Float32Array;
  sun: { alt: number; az: number; vec: number[] };
  moon: { alt: number; az: number; vec: number[]; phaseDeg: number };
  epj: number;
}

export interface StarAttributes {
  count: number;
  /** Point size in CSS pixels before device pixel ratio. */
  sizes: Float32Array;
  /** Linear RGB per star. */
  colors: Float32Array;
  /** 0–1 brightness weight. */
  brightness: Float32Array;
  hip: Int32Array;
}

/** B−V colour index to an approximate linear RGB tint (Ballesteros 2012 temperature). */
function bvToRgb(bv: number): [number, number, number] {
  const b = Math.min(Math.max(bv, -0.4), 2);
  const t = 4600 * (1 / (0.92 * b + 1.7) + 1 / (0.92 * b + 0.62));
  // Gentle blackbody-ish tint, kept close to white so the sky stays calm.
  const warm = Math.min(Math.max((6500 - t) / 3500, -1), 1);
  const r = 1 + Math.min(warm, 0) * 0.25;
  const g = 1 - Math.abs(warm) * 0.12;
  const bl = 1 - Math.max(warm, 0) * 0.35;
  return [r, g, bl];
}

function starAttributes(catalog: StarCatalogV1): StarAttributes {
  const n = catalog.stars.length;
  const sizes = new Float32Array(n);
  const colors = new Float32Array(n * 3);
  const brightness = new Float32Array(n);
  const hip = new Int32Array(n);
  catalog.stars.forEach((row, i) => {
    const [id, , , , , vmag, bv] = row;
    hip[i] = id;
    const flux = Math.pow(10, -0.4 * (vmag - 1));
    sizes[i] = Math.min(9, 2.2 + 3 * Math.sqrt(flux));
    brightness[i] = Math.min(1, 0.35 + 0.9 * Math.sqrt(flux));
    colors.set(bvToRgb(bv), i * 3);
  });
  return { count: n, sizes, colors, brightness, hip };
}

/**
 * Loads the star catalog once and solves the sky in a Web Worker whenever the
 * input changes. Only the newest request's answer is applied.
 */
export function useSky(input: SkyInput) {
  const [catalog, setCatalog] = useState<StarCatalogV1 | null>(null);
  const [result, setResult] = useState<SkyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const latest = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetch(STAR_CATALOG_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`Star catalog request failed (${r.status})`);
        return r.json();
      })
      .then((json) => {
        if (!cancelled) setCatalog(StarCatalogV1.parse(json));
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Star catalog failed to load');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!catalog) return;
    const worker = new Worker(new URL('../../lib/astro/sky.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.postMessage({ type: 'catalog', stars: catalog.stars });
    worker.onmessage = (e: MessageEvent) => {
      if (e.data.id === latest.current) setResult(e.data as SkyResult);
    };
    worker.onerror = () => setError('The sky calculation failed');
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [catalog]);

  const { year, dayOfYear, solarHour, latDeg, lonDeg } = input;
  useEffect(() => {
    const worker = workerRef.current;
    if (!worker) return;
    const id = ++latest.current;
    worker.postMessage({
      type: 'solve',
      id,
      input: { year, dayOfYear, solarHour, latDeg, lonDeg },
    });
  }, [catalog, year, dayOfYear, solarHour, latDeg, lonDeg]);

  const attributes = useMemo(() => (catalog ? starAttributes(catalog) : null), [catalog]);
  return { result, attributes, error };
}
