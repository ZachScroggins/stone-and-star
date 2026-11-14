// Single source of truth for closed value sets (see the planning handoff, section 8).
// Adding a value is non-breaking; renaming or removing one needs a data migration.
// In Postgres these become text columns with CHECK constraints, never ENUMs.

export const RECEPTION = ['consensus', 'debated', 'minority', 'unassessed', 'withdrawn'] as const;
export const BASIS = [
  'measured',
  'documented',
  'inferred',
  'numerical_pattern',
  'hypothesis',
] as const;
export const CLAIM_RELATIONS = ['supports', 'rebuts', 'depends_on', 'contradicts'] as const;
export const EVIDENCE_STANCES = ['supports', 'contradicts', 'context'] as const;
export const SOURCE_TYPES = [
  'journal',
  'book',
  'museum',
  'database',
  'web',
  'podcast',
  'video',
  'other',
] as const;
export const MEASUREMENT_CONDITIONS = [
  'as_built',
  'surviving',
  'reconstructed',
  'unspecified',
] as const;
export const DATE_PRECISIONS = ['exact', 'decade', 'century', 'approximate'] as const;
export const ASSET_KINDS = ['procedural', 'gltf', 'splat'] as const;
export const TARGET_KINDS = ['sun', 'moon', 'star', 'planet'] as const;
export const CANDIDATE_STATUSES = ['pending', 'approved', 'rejected', 'superseded'] as const;
export const CANDIDATE_KINDS = ['measurement', 'event', 'claim', 'label'] as const;
/** Which side of a contested question a claim sits on (the Views tab's two columns). */
export const VIEW_SIDES = ['mainstream', 'alternative'] as const;
export const PROPONENT_KINDS = ['person', 'institution'] as const;
/** How a structure axis is tested against the sky. */
export const ALIGNMENT_KINDS = ['culmination', 'rising', 'setting'] as const;
export const MERIDIAN_SIDES = ['north', 'south'] as const;
export const MODEL_ROLES = ['chat', 'guard'] as const;
export const KEY_SOURCES = ['byok_anthropic', 'guest', 'dev_local'] as const;
export const USAGE_KINDS = ['chat', 'guard', 'ingest'] as const;

export type Reception = (typeof RECEPTION)[number];
export type Basis = (typeof BASIS)[number];
export type MeasurementCondition = (typeof MEASUREMENT_CONDITIONS)[number];
export type ViewSide = (typeof VIEW_SIDES)[number];
export type DatePrecision = (typeof DATE_PRECISIONS)[number];
export type AlignmentKind = (typeof ALIGNMENT_KINDS)[number];
export type ModelRole = (typeof MODEL_ROLES)[number];
export type KeySource = (typeof KEY_SOURCES)[number];
