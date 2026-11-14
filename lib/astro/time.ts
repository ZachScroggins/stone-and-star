// Time scales. The sky pipeline treats UT as equal to TT (no ΔT model): ancient
// ΔT is uncertain by hours, and the app sets the sky by local solar time instead
// of clock time, so ΔT only shifts the Sun's position by a fraction of a degree.

export const J2000 = 2451545.0;
export const DAYS_PER_JULIAN_YEAR = 365.25;

/**
 * Julian date at 0h UT of a proleptic Gregorian calendar date.
 * `year` is astronomical (1 BCE = 0). Fliegel & Van Flandern (1968) integer
 * algorithm, valid for any integer year when written with floor division.
 */
export function jdFromGregorian(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const jdn =
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;
  return jdn - 0.5;
}

/** Julian date at 0h UT on day `dayOfYear` (1-based) of a proleptic Gregorian year. */
export function jdFromDayOfYear(year: number, dayOfYear: number): number {
  return jdFromGregorian(year, 1, 1) + (dayOfYear - 1);
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

/** Julian epoch (e.g. 2000.0) for a Julian date. */
export function julianEpoch(jd: number): number {
  return 2000.0 + (jd - J2000) / DAYS_PER_JULIAN_YEAR;
}
