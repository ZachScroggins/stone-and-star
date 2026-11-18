import type { z } from 'zod';

import type { AlignmentHypothesis, ReferenceQuantity } from '@/lib/contracts/alignment';
import type { Claim, Proponent, Question, Source } from '@/lib/contracts/claims';
import type { TimelineEvent } from '@/lib/contracts/timeline';
import { fromBce } from '@/lib/years';

// PLACEHOLDER DATA for the info panel (milestone 3). Every record is
// `unverified: true` and cites no evidence. Wording follows the planning handoff's
// research notes (section 12), which are starting points, not vetted data. No quotes
// or passages: those arrive only through the sourcing pipeline (milestone 6).
// Labels (reception, basis) are the handoff's illustrative pairings, not reviewed labels.

const PLACEHOLDER = 'Placeholder from the planning notes; not yet sourced or reviewed.';
const site = { siteSlug: 'giza', unverified: true, note: PLACEHOLDER } as const;
const unverified = { unverified: true, note: PLACEHOLDER } as const;

/** A record before the shared site and provenance fields are added. */
type Draft<T extends z.ZodType> = Omit<z.input<T>, 'siteSlug' | 'unverified' | 'note'>;

/** Only sources the planning notes name. Titles and details still need checking. */
export const gizaSources: z.input<typeof Source>[] = (
  [
    {
      slug: 'schoch-forgotten-civilization',
      title: 'Forgotten Civilization',
      authors: ['Robert M. Schoch'],
      url: 'https://www.simonandschuster.com/books/Forgotten-Civilization/Robert-M-Schoch/9781644111833',
      type: 'book',
    },
    {
      slug: 'stocks-experiments-in-egyptian-archaeology',
      title: 'Experiments in Egyptian Archaeology',
      authors: ['Denys A. Stocks'],
      publisher: 'Routledge',
      url: 'https://www.routledge.com/Experiments-in-Egyptian-Archaeology-Stoneworking-Technology-in-Ancient/Stocks/p/book/9781032217574',
      type: 'book',
    },
    {
      slug: 'history-today-merer-papyri',
      title: 'Merer papyri overview',
      publisher: 'History Today',
      url: 'https://www.historytoday.com/archive/history-matters/monumental-record',
      type: 'web',
    },
    {
      slug: 'jre-2374-van-kerkwyk',
      title: 'The Joe Rogan Experience #2374: Ben van Kerkwyk',
      url: 'https://podcasts.happyscribe.com/the-joe-rogan-experience/2374-ben-van-kerkwyk',
      type: 'podcast',
    },
  ] satisfies Draft<typeof Source>[]
).map((s) => ({ ...s, ...unverified }));

export const gizaProponents: z.input<typeof Proponent>[] = (
  [
    {
      slug: 'robert-schoch',
      name: 'Robert Schoch',
      kind: 'person',
      description: 'Geologist at Boston University.',
    },
    {
      slug: 'graham-hancock',
      name: 'Graham Hancock',
      kind: 'person',
      description: 'Journalist and author.',
    },
    {
      slug: 'ben-van-kerkwyk',
      name: 'Ben van Kerkwyk',
      kind: 'person',
      description: 'Independent researcher, creator of UnchartedX.',
    },
    {
      slug: 'randall-carlson',
      name: 'Randall Carlson',
      kind: 'person',
      description: 'Independent researcher and self-described geomythologist.',
    },
  ] satisfies Draft<typeof Proponent>[]
).map((p) => ({ ...p, ...unverified }));

export const gizaQuestions: z.input<typeof Question>[] = (
  [
    {
      slug: 'how-old-is-the-sphinx',
      title: 'How old is the Great Sphinx?',
      agreements: [
        'The walls of the Sphinx enclosure are heavily weathered.',
        'The Sphinx sits within the layout of Khafre’s pyramid complex.',
      ],
      differences: [
        'What caused the weathering, and over how long.',
        'Whether the enclosure was cut for Khafre’s complex or long before it.',
      ],
      whatWouldSettleIt: [
        'An independent date for the weathering of the enclosure walls.',
        'Evidence of building at Giza from long before the Fourth Dynasty.',
      ],
    },
    {
      slug: 'when-was-the-great-pyramid-built',
      title: 'When was the Great Pyramid built?',
      agreements: ['Monumental building began earlier than was once thought (Göbekli Tepe).'],
      differences: [
        'Whether the Fourth Dynasty built the pyramid from scratch or inherited an older site.',
      ],
      whatWouldSettleIt: [
        'Datable material from the pyramid’s construction that falls outside Khufu’s reign.',
        'Any physical trace at Giza of a culture older than the Old Kingdom.',
      ],
    },
    {
      slug: 'how-was-the-granite-worked',
      title: 'How was the granite worked?',
      agreements: ['Egyptian granite work shows a high level of precision.'],
      differences: [
        'Whether copper tools and abrasive sand can account for the finest pieces in the time available.',
      ],
      whatWouldSettleIt: [
        'Replication of the finest pieces with period tools, measured to the same tolerances.',
        'Provenance for the tested vessels.',
      ],
    },
  ] satisfies Draft<typeof Question>[]
).map((q) => ({ ...q, ...site }));

export const gizaClaims: z.input<typeof Claim>[] = (
  [
    {
      slug: 'sphinx-carved-under-khafre',
      structureSlug: 'great-sphinx',
      questionSlug: 'how-old-is-the-sphinx',
      side: 'mainstream',
      statement: 'The Sphinx was carved under Khafre, in the Fourth Dynasty.',
      reception: 'consensus',
      basis: 'inferred',
      heldBy: 'Most Egyptologists and geologists',
      evidenceCited: [
        'The enclosure fits the layout of Khafre’s pyramid complex.',
        'Limestone from the enclosure appears in nearby buildings.',
      ],
      limits: ['Some geoscientists agree part of the erosion predates the carving.'],
    },
    {
      slug: 'sphinx-carved-much-earlier',
      structureSlug: 'great-sphinx',
      questionSlug: 'how-old-is-the-sphinx',
      side: 'alternative',
      statement: 'The Sphinx enclosure was carved thousands of years before Khafre.',
      reception: 'minority',
      basis: 'inferred',
      proponentSlugs: ['robert-schoch', 'graham-hancock'],
      evidenceCited: [
        'Weathering on the enclosure, heaviest at the top, which Schoch argues fits prolonged rainfall better than flooding.',
      ],
      limits: [
        'Schoch’s estimates have ranged from about 10,000 to 5000 BCE.',
        'Most Egyptologists and geologists reject the early date.',
      ],
      sourceSlugs: ['schoch-forgotten-civilization'],
    },
    {
      slug: 'great-pyramid-built-under-khufu',
      structureSlug: 'great-pyramid',
      questionSlug: 'when-was-the-great-pyramid-built',
      side: 'mainstream',
      statement: 'The Great Pyramid was built under Khufu, in the Fourth Dynasty.',
      reception: 'consensus',
      basis: 'documented',
      heldBy: 'Egyptologists',
      evidenceCited: [
        'The Merer papyri from Wadi al-Jarf: a logbook recording casing stone shipped to Giza.',
        'The workers’ settlement at Heit el-Ghurab.',
      ],
      limits: ['The logbook doesn’t say where each stone was used.'],
      sourceSlugs: ['history-today-merer-papyri'],
    },
    {
      slug: 'lost-ice-age-civilization',
      questionSlug: 'when-was-the-great-pyramid-built',
      side: 'alternative',
      statement:
        'An advanced civilization destroyed by a cataclysm about 12,000 years ago left a legacy that sites like Giza preserve.',
      reception: 'minority',
      basis: 'hypothesis',
      proponentSlugs: ['graham-hancock', 'randall-carlson'],
      evidenceCited: [
        'Göbekli Tepe shows monumental building by at least 10,000 BCE.',
        'Missing physical evidence may lie underwater.',
      ],
      limits: [
        'Göbekli Tepe doesn’t by itself connect to Giza or to a lost civilization.',
        'The Society for American Archaeology said in 2022 that the claims lack evidence; Hancock replied point by point.',
      ],
    },
    {
      slug: 'granite-worked-with-copper-and-sand',
      questionSlug: 'how-was-the-granite-worked',
      side: 'mainstream',
      statement: 'Copper saws and tube drills with quartz sand abrasive can cut Aswan granite.',
      reception: 'consensus',
      basis: 'measured',
      heldBy: 'Experimental archaeologists',
      evidenceCited: ['Denys Stocks’ experiments cut Aswan granite with these tools, slowly.'],
      limits: ['The experiments show the method works; they don’t time every piece at Giza.'],
      sourceSlugs: ['stocks-experiments-in-egyptian-archaeology'],
    },
    {
      slug: 'precision-beyond-dynastic-tools',
      questionSlug: 'how-was-the-granite-worked',
      side: 'alternative',
      statement:
        'The precision of some Egyptian granite and stone vessels is beyond what dynastic tools could plausibly achieve.',
      reception: 'minority',
      basis: 'inferred',
      proponentSlugs: ['ben-van-kerkwyk'],
      evidenceCited: ['Measurements of stone vessels and granite surfaces.'],
      limits: ['Critics note that one tested vase had no known provenance.'],
      sourceSlugs: ['jre-2374-van-kerkwyk'],
    },
    {
      slug: 'kings-chamber-south-shaft-orion',
      structureSlug: 'great-pyramid',
      statement:
        'The King’s Chamber southern shaft pointed at Orion’s Belt (Alnitak) as it crossed the meridian.',
      reception: 'debated',
      basis: 'inferred',
    },
    {
      slug: 'kings-chamber-north-shaft-thuban',
      structureSlug: 'great-pyramid',
      statement:
        'The King’s Chamber northern shaft pointed at Thuban, then the pole star, as it crossed the meridian.',
      reception: 'debated',
      basis: 'inferred',
    },
  ] satisfies Draft<typeof Claim>[]
).map((c) => ({ ...c, ...site }));

// Shaft angles are commonly quoted round figures; the uncertainty is a placeholder.
export const gizaAlignments: z.input<typeof AlignmentHypothesis>[] = (
  [
    {
      slug: 'kings-chamber-south-shaft-alnitak',
      structureSlug: 'great-pyramid',
      title: 'Southern shaft and Orion’s Belt',
      axisLabel: 'King’s Chamber southern shaft',
      kind: 'culmination',
      meridian: 'south',
      axisDeg: 45,
      axisUncertaintyDeg: 0.5,
      targetKey: 'star:HIP-26727',
      targetName: 'Alnitak (ζ Orionis)',
      epochStart: fromBce(2589),
      epochEnd: fromBce(2566),
      claimSlug: 'kings-chamber-south-shaft-orion',
    },
    {
      slug: 'kings-chamber-north-shaft-thuban',
      structureSlug: 'great-pyramid',
      title: 'Northern shaft and Thuban',
      axisLabel: 'King’s Chamber northern shaft',
      kind: 'culmination',
      meridian: 'north',
      axisDeg: 32.5,
      axisUncertaintyDeg: 0.5,
      targetKey: 'star:HIP-68756',
      targetName: 'Thuban (α Draconis)',
      epochStart: fromBce(2589),
      epochEnd: fromBce(2566),
      claimSlug: 'kings-chamber-north-shaft-thuban',
    },
  ] satisfies Draft<typeof AlignmentHypothesis>[]
).map((a) => ({ ...a, ...site }));

// Reign dates follow one commonly quoted chronology; other chronologies differ by
// decades, which the Khufu entry shows. Placeholders until sourced.
export const gizaTimeline: z.input<typeof TimelineEvent>[] = (
  [
    {
      slug: 'reign-of-khufu',
      structureSlug: 'great-pyramid',
      title: 'Reign of Khufu',
      start: fromBce(2589),
      end: fromBce(2566),
      precision: 'approximate',
      alternatives: [
        {
          start: fromBce(2551),
          end: fromBce(2528),
          precision: 'approximate',
          label: 'An older, lower chronology',
        },
      ],
    },
    {
      slug: 'merer-logbook',
      structureSlug: 'great-pyramid',
      title: 'Merer’s logbook records casing stone shipped to Giza',
      start: fromBce(2560),
      end: fromBce(2560),
      precision: 'approximate',
      sourceSlugs: ['history-today-merer-papyri'],
    },
    {
      slug: 'reign-of-khafre',
      structureSlug: 'khafre-pyramid',
      title: 'Reign of Khafre',
      start: fromBce(2558),
      end: fromBce(2532),
      precision: 'approximate',
    },
    {
      slug: 'sphinx-carved',
      structureSlug: 'great-sphinx',
      title: 'Sphinx carved (mainstream dating, under Khafre)',
      start: fromBce(2558),
      end: fromBce(2532),
      precision: 'approximate',
      alternatives: [
        {
          start: fromBce(10000),
          end: fromBce(5000),
          precision: 'approximate',
          label: 'Schoch’s water-erosion estimates',
          sourceSlug: 'schoch-forgotten-civilization',
        },
      ],
    },
    {
      slug: 'reign-of-menkaure',
      structureSlug: 'menkaure-pyramid',
      title: 'Reign of Menkaure',
      start: fromBce(2532),
      end: fromBce(2503),
      precision: 'approximate',
    },
  ] satisfies Draft<typeof TimelineEvent>[]
).map((e) => ({ ...e, ...site }));

// WGS84 ellipsoid values. Not placeholders, but no source record yet, so unverified.
const WGS84 = 'WGS84 ellipsoid; source record pending.';
export const referenceQuantities: z.input<typeof ReferenceQuantity>[] = (
  [
    {
      slug: 'earth-polar-radius',
      name: 'Earth’s polar radius',
      value: 6_356_752.314,
      definition: 'Semi-minor axis of the WGS84 ellipsoid.',
    },
    {
      slug: 'earth-equatorial-radius',
      name: 'Earth’s equatorial radius',
      value: 6_378_137,
      definition: 'Semi-major axis of the WGS84 ellipsoid.',
    },
    {
      slug: 'earth-meridional-circumference',
      name: 'Earth’s meridional circumference',
      value: 40_007_862.917,
      definition: 'Pole-to-pole circumference of the WGS84 ellipsoid.',
    },
    {
      slug: 'earth-equatorial-circumference',
      name: 'Earth’s equatorial circumference',
      value: 40_075_016.686,
      definition: 'Equator length of the WGS84 ellipsoid (2πa).',
    },
  ] satisfies Draft<typeof ReferenceQuantity>[]
).map((r) => ({ ...r, unverified: true, note: WGS84 }));
