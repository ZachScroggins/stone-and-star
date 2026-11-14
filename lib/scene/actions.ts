import { z } from 'zod';

// Typed scene actions. UI controls and the chatbot's client tools dispatch the same
// actions to one scene store (lib/scene/store.ts).
// Additive changes only: new action types or new optional fields.

export const SCENE_LAYERS = [
  'dimensions',
  'alignment',
  'skyDome',
  'labels',
  /** Added in M2: zodiac stick figures and names. */
  'constellations',
] as const;
export const PANEL_TABS = ['facts', 'sky', 'timeline', 'views'] as const;
export const PANEL_SIZES = ['icon', 'phone', 'full'] as const;
/** Which version of each structure the scene shows. */
export const MODEL_CONDITIONS = ['as_built', 'surviving'] as const;
/** Camera mode: orbit the site from above, or stand on the plateau and look at the sky. */
export const SCENE_VIEWS = ['overview', 'sky'] as const;

/** Day of the proleptic Gregorian year (1-based). */
const DayOfYear = z.number().int().min(1).max(366);
/** Local apparent solar time in hours; 12 is the Sun on the meridian. */
const SolarHour = z.number().min(0).max(24);

/**
 * Where the viewer stands in sky view, and where they look. Heading is degrees
 * clockwise from true north; pitch is degrees above the horizon.
 */
export const Standpoint = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360),
  pitch: z.number().min(-90).max(90),
});
export type Standpoint = z.infer<typeof Standpoint>;

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Expected a kebab-case slug');

export const SceneAction = z.discriminatedUnion('type', [
  z.object({ type: z.literal('setLayer'), layer: z.enum(SCENE_LAYERS), on: z.boolean() }),
  /** Astronomical year (1 BCE = 0). */
  z.object({ type: z.literal('setEpoch'), year: z.number().int().min(-20000).max(3000) }),
  /** Anchor slug. */
  z.object({ type: z.literal('focusCamera'), anchor: slug }),
  /** Structure or anchor slugs. An empty array clears highlights. */
  z.object({ type: z.literal('highlight'), targets: z.array(slug).max(6) }),
  /** Celestial target key, e.g. `star:HIP-11767` or `sun:summer-solstice-sunrise`. */
  z.object({
    type: z.literal('selectTarget'),
    targetKey: z.string().regex(/^(sun|moon|star|planet):[A-Za-z0-9-]+$/),
  }),
  z.object({
    type: z.literal('openPanel'),
    tab: z.enum(PANEL_TABS),
    size: z.enum(PANEL_SIZES).optional(),
  }),
  /** Added in M2. Either field may be sent alone. */
  z.object({
    type: z.literal('setSkyTime'),
    dayOfYear: DayOfYear.optional(),
    solarHour: SolarHour.optional(),
  }),
  /** Added in M2. */
  z.object({ type: z.literal('setModelCondition'), condition: z.enum(MODEL_CONDITIONS) }),
  /** Added in M2. */
  z.object({ type: z.literal('setView'), view: z.enum(SCENE_VIEWS) }),
  /** Added in M2. `null` returns to the site's default standpoint. */
  z.object({ type: z.literal('setStandpoint'), standpoint: Standpoint.nullable() }),
]);
export type SceneAction = z.infer<typeof SceneAction>;

/** Versioned scene state, serialized to the URL for shareable links. */
export const SceneStateV1 = z.object({
  v: z.literal(1),
  layers: z.record(z.enum(SCENE_LAYERS), z.boolean()),
  epoch: z.number().int(),
  focus: slug.nullable(),
  highlights: z.array(slug).max(6),
  target: z.string().nullable(),
  panel: z.object({ tab: z.enum(PANEL_TABS), size: z.enum(PANEL_SIZES) }),
  /** Added in M2 (optional, so v1 links from before it still parse). */
  sky: z.object({ dayOfYear: DayOfYear, solarHour: SolarHour }).optional(),
  condition: z.enum(MODEL_CONDITIONS).optional(),
  view: z.enum(SCENE_VIEWS).optional(),
  /** Added in M2. `null` means the site's default standpoint. */
  standpoint: Standpoint.nullable().optional(),
});
export type SceneStateV1 = z.infer<typeof SceneStateV1>;
