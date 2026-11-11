import type { z } from 'zod';

import type { Measurement, Site, Structure } from '@/lib/contracts/site';

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
  { structureSlug: 'menkaure-pyramid', property: 'height', condition: 'as_built', value: 65 },
];

export const gizaMeasurements: z.input<typeof Measurement>[] = measurements.map((m) => ({
  ...m,
  slug: `${m.structureSlug}-${m.property}-${m.condition.replace('_', '-')}`,
  preferred: true,
  unverified: true,
  note: PLACEHOLDER,
}));
