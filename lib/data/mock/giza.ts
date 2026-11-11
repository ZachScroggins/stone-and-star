import type { z } from 'zod';

import type { Anchor, Measurement, Site, Structure } from '@/lib/contracts/site';

// PLACEHOLDER DATA. Every record is `unverified: true` and cites no source.
// Numbers are commonly quoted approximations used only to build the UI. They must
// go through the sourcing pipeline (milestone 6) before they are shown as facts.

const PLACEHOLDER = 'Placeholder: commonly quoted approximation, not yet sourced.';

export const gizaSite: z.input<typeof Site> = {
  slug: 'giza',
  name: 'Giza',
  region: 'Giza Plateau, Egypt',
  coordinates: { lat: 29.9792, lon: 31.1342, elevationM: 60 },
  summary:
    'The Giza pyramid complex on the plateau west of the Nile: three main pyramids, the Great Sphinx, temples and cemeteries.',
  theme: 'egypt',
  unverified: true,
  note: PLACEHOLDER,
};

export const gizaStructures: z.input<typeof Structure>[] = [
  { slug: 'great-pyramid', name: 'Great Pyramid', kind: 'pyramid' },
  { slug: 'khafre-pyramid', name: 'Pyramid of Khafre', kind: 'pyramid' },
  { slug: 'menkaure-pyramid', name: 'Pyramid of Menkaure', kind: 'pyramid' },
  { slug: 'great-sphinx', name: 'Great Sphinx', kind: 'monument' },
].map((s) => ({ ...s, siteSlug: 'giza', unverified: true, note: PLACEHOLDER }));

type M = Pick<z.input<typeof Measurement>, 'structureSlug' | 'property' | 'condition' | 'value'>;

const measurements: M[] = [
  {
    structureSlug: 'great-pyramid',
    property: 'base-side-length',
    condition: 'as_built',
    value: 230.3,
  },
  { structureSlug: 'great-pyramid', property: 'height', condition: 'as_built', value: 146.6 },
  { structureSlug: 'great-pyramid', property: 'height', condition: 'surviving', value: 138.5 },
  {
    structureSlug: 'khafre-pyramid',
    property: 'base-side-length',
    condition: 'as_built',
    value: 215.3,
  },
  { structureSlug: 'khafre-pyramid', property: 'height', condition: 'as_built', value: 143.5 },
  {
    structureSlug: 'menkaure-pyramid',
    property: 'base-side-length',
    condition: 'as_built',
    value: 103.4,
  },
  { structureSlug: 'menkaure-pyramid', property: 'height', condition: 'as_built', value: 65 },
  { structureSlug: 'khafre-pyramid', property: 'height', condition: 'surviving', value: 136.4 },
];

export const gizaMeasurements: z.input<typeof Measurement>[] = measurements.map((m) => ({
  ...m,
  slug: `${m.structureSlug}-${m.property}-${m.condition.replace('_', '-')}`,
  preferred: true,
  unverified: true,
  note: PLACEHOLDER,
}));

type A = Pick<z.input<typeof Anchor>, 'slug' | 'structureSlug' | 'name' | 'kind' | 'lat' | 'lon'>;

// Structure centres (WGS84). Placeholders like the rest of this file; the scene
// treats each pyramid as aligned to true north until sourced data says otherwise.
const anchors: A[] = [
  {
    slug: 'great-pyramid-center',
    structureSlug: 'great-pyramid',
    name: 'Great Pyramid',
    kind: 'structure-center',
    lat: 29.97917,
    lon: 31.13417,
  },
  {
    slug: 'khafre-pyramid-center',
    structureSlug: 'khafre-pyramid',
    name: 'Pyramid of Khafre',
    kind: 'structure-center',
    lat: 29.97611,
    lon: 31.13083,
  },
  {
    slug: 'menkaure-pyramid-center',
    structureSlug: 'menkaure-pyramid',
    name: 'Pyramid of Menkaure',
    kind: 'structure-center',
    lat: 29.9725,
    lon: 31.12806,
  },
  {
    slug: 'great-sphinx-center',
    structureSlug: 'great-sphinx',
    name: 'Great Sphinx',
    kind: 'structure-center',
    lat: 29.97528,
    lon: 31.13757,
  },
];

export const gizaAnchors: z.input<typeof Anchor>[] = anchors.map((a) => ({
  ...a,
  siteSlug: 'giza',
  unverified: true,
  note: PLACEHOLDER,
}));
