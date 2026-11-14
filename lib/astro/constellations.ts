import { z } from 'zod';

/** What a stick figure is: an IAU constellation or an asterism (a pattern inside or across them). */
export const FIGURE_KINDS = ['constellation', 'asterism'] as const;

/** One stick figure. Each line is a polyline of HIP numbers. */
export const SkyFigure = z.object({
  /** Stellarium's figure id suffix: IAU abbreviation (`Tau`) or asterism code (`BDr`). */
  id: z.string().regex(/^[A-Za-z0-9]{2,4}$/),
  kind: z.enum(FIGURE_KINDS),
  /** Display name, e.g. `Taurus` or `Big Dipper`. */
  name: z.string().min(1),
  /** English meaning or alternative name, e.g. `Bull` or `Plough`. */
  english: z.string().min(1),
  lines: z.array(z.array(z.number().int().positive()).min(2)).min(1),
});
export type SkyFigure = z.infer<typeof SkyFigure>;

/** A star labelled on its own (e.g. Polaris). */
export const NamedStar = z.object({
  hip: z.number().int().positive(),
  name: z.string().min(1),
});
export type NamedStar = z.infer<typeof NamedStar>;

export const SkyFiguresV1 = z.object({
  v: z.literal(1),
  source: z.string().min(1),
  license: z.string().min(1),
  figures: z.array(SkyFigure).min(1),
  stars: z.array(NamedStar),
});
export type SkyFiguresV1 = z.infer<typeof SkyFiguresV1>;

export const SKY_FIGURES_URL = '/data/sky-figures-v1.json';

/** Line segments as pairs of HIP numbers, for drawing with `LineSegments`. */
export function figureSegments(figure: Pick<SkyFigure, 'lines'>): [number, number][] {
  const out: [number, number][] = [];
  for (const line of figure.lines) {
    for (let i = 1; i < line.length; i++) out.push([line[i - 1], line[i]]);
  }
  return out;
}
