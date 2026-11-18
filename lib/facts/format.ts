import { MEASUREMENT_PROPERTIES, type Measurement } from '@/lib/contracts/site';
import type { Basis, DatePrecision, Reception } from '@/lib/vocab';
import { formatYear } from '@/lib/years';

export const CONDITION_LABELS: Record<Measurement['condition'], string> = {
  as_built: 'As built',
  surviving: 'Surviving',
  reconstructed: 'Reconstructed',
  unspecified: 'Unspecified',
};

export function formatMeasurementValue(m: Pick<Measurement, 'property' | 'value'>) {
  const { unit } = MEASUREMENT_PROPERTIES[m.property];
  return unit === 'deg' ? `${m.value}°` : `${m.value} m`;
}

/** Reception: where a claim stands among specialists. No value reads as a verdict. */
export const RECEPTION_LABELS: Record<Reception, string> = {
  consensus: 'Consensus',
  debated: 'Debated',
  minority: 'Minority view',
  unassessed: 'Not yet assessed',
  withdrawn: 'Withdrawn',
};

/** Basis: what kind of claim it is. */
export const BASIS_LABELS: Record<Basis, string> = {
  measured: 'Measured',
  documented: 'Documented',
  inferred: 'Inferred',
  numerical_pattern: 'Numerical pattern',
  hypothesis: 'Hypothesis',
};

/**
 * A year range for display: "c. 2589–2566 BCE", "2560 BCE", "10,000–5000 BCE".
 * Years are astronomical integers.
 */
export function formatYearRange(start: number, end: number, precision: DatePrecision): string {
  const prefix = precision === 'exact' ? '' : 'c. ';
  if (start === end) return prefix + formatYear(start);
  const sameEra = start <= 0 === end <= 0;
  const label = (y: number) => formatYear(y).replace(/ (BCE|CE)$/, '');
  return sameEra
    ? `${prefix}${label(start)}–${label(end)} ${start <= 0 ? 'BCE' : 'CE'}`
    : `${prefix}${formatYear(start)}–${formatYear(end)}`;
}
