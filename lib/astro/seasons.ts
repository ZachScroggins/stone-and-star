import { AstroTime, SearchSunLongitude } from 'astronomy-engine';

import { J2000, jdFromGregorian } from './time';

export const SEASON_EVENTS = {
  'march-equinox': { label: 'March equinox', longitude: 0, approxDay: 79 },
  'june-solstice': { label: 'June solstice', longitude: 90, approxDay: 171 },
  'september-equinox': { label: 'September equinox', longitude: 180, approxDay: 265 },
  'december-solstice': { label: 'December solstice', longitude: 270, approxDay: 354 },
} as const;
export type SeasonEvent = keyof typeof SEASON_EVENTS;

/**
 * Day of the proleptic Gregorian year (1-based) on which the Sun reaches the
 * event's ecliptic longitude, at the given longitude east. Uses terrestrial time
 * throughout, matching the rest of the sky pipeline (UT taken equal to TT).
 */
export function seasonDayOfYear(year: number, event: SeasonEvent, lonDeg: number): number {
  const { longitude, approxDay } = SEASON_EVENTS[event];
  const jan1 = jdFromGregorian(year, 1, 1);
  const start = AstroTime.FromTerrestrialTime(jan1 + approxDay - 20 - J2000);
  const hit = SearchSunLongitude(longitude, start, 40);
  if (!hit) return approxDay;
  const localJd = hit.tt + J2000 + lonDeg / 360;
  return Math.floor(localJd + 0.5 - (jan1 + 0.5)) + 1;
}

/** "21 June" style label for a day of a proleptic Gregorian year. */
export function formatDayOfYear(year: number, dayOfYear: number): string {
  const jd = jdFromGregorian(year, 1, 1) + dayOfYear - 1 + 0.5;
  // Invert with the Fliegel–Van Flandern algorithm.
  const l0 = Math.floor(jd + 0.5) + 68569;
  const n = Math.floor((4 * l0) / 146097);
  const l1 = l0 - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l1 + 1)) / 1461001);
  const l2 = l1 - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * l2) / 2447);
  const day = l2 - Math.floor((2447 * j) / 80);
  const month = j + 2 - 12 * Math.floor(j / 11);
  return `${day} ${MONTHS[month - 1]}`;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
