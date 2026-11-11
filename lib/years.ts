// Years are stored as astronomical integers: 1 BCE = 0, 2 BCE = -1, 2560 BCE = -2559.
// Precession math then becomes plain arithmetic. Always convert with these helpers;
// never hand-write a BCE year as a negative number.

function assertCalendarYear(year: number) {
  if (!Number.isInteger(year) || year < 1) {
    throw new RangeError(`Expected a calendar year of 1 or later, got ${year}`);
  }
}

/** Calendar year BCE → astronomical year. `fromBce(2560)` is -2559. */
export function fromBce(year: number): number {
  assertCalendarYear(year);
  return 1 - year;
}

/** Calendar year CE → astronomical year (unchanged). */
export function fromCe(year: number): number {
  assertCalendarYear(year);
  return year;
}

/** Astronomical year → display label, e.g. -2559 → "2560 BCE", 2026 → "2026 CE". */
export function formatYear(astronomicalYear: number): string {
  if (!Number.isInteger(astronomicalYear)) {
    throw new RangeError(`Expected an integer year, got ${astronomicalYear}`);
  }
  return astronomicalYear <= 0 ? `${1 - astronomicalYear} BCE` : `${astronomicalYear} CE`;
}
