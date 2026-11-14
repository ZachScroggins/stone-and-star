import { z } from 'zod';

/** One constellation's stick figure. Each line is a polyline of HIP numbers. */
export const ConstellationFigure = z.object({
  /** IAU three-letter abbreviation, e.g. `Tau`. */
  abbr: z.string().regex(/^[A-Z][a-z]{2}$/),
  /** IAU (Latin) name, e.g. `Taurus`. */
  name: z.string().min(1),
  /** English meaning, e.g. `Bull`. */
  english: z.string().min(1),
  lines: z.array(z.array(z.number().int().positive()).min(2)).min(1),
});
export type ConstellationFigure = z.infer<typeof ConstellationFigure>;

export const ConstellationSetV1 = z.object({
  v: z.literal(1),
  source: z.string().min(1),
  license: z.string().min(1),
  constellations: z.array(ConstellationFigure).min(1),
});
export type ConstellationSetV1 = z.infer<typeof ConstellationSetV1>;

export const ZODIAC_CONSTELLATIONS_URL = '/data/constellations-zodiac-v1.json';

/** Line segments as pairs of HIP numbers, for drawing with `LineSegments`. */
export function figureSegments(figure: ConstellationFigure): [number, number][] {
  const out: [number, number][] = [];
  for (const line of figure.lines) {
    for (let i = 1; i < line.length; i++) out.push([line[i - 1], line[i]]);
  }
  return out;
}
