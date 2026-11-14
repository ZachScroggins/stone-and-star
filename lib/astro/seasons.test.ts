import { describe, expect, it } from 'vitest';

import { formatDayOfYear, seasonDayOfYear } from './seasons';

describe('seasonDayOfYear', () => {
  it('finds the 2026 solstices and equinoxes on their usual dates', () => {
    // Calendar facts for the Gregorian calendar today: March 19-21, June 20-22,
    // September 22-23, December 21-22.
    const d = (e: Parameters<typeof seasonDayOfYear>[1]) =>
      formatDayOfYear(2026, seasonDayOfYear(2026, e, 31.13));
    expect(['19 March', '20 March', '21 March']).toContain(d('march-equinox'));
    expect(['20 June', '21 June', '22 June']).toContain(d('june-solstice'));
    expect(['22 September', '23 September']).toContain(d('september-equinox'));
    expect(['21 December', '22 December']).toContain(d('december-solstice'));
  });

  it('works thousands of years back', () => {
    const day = seasonDayOfYear(-2559, 'june-solstice', 31.13);
    expect(day).toBeGreaterThan(150);
    expect(day).toBeLessThan(200);
  });
});

describe('formatDayOfYear', () => {
  it('handles leap years', () => {
    expect(formatDayOfYear(2024, 60)).toBe('29 February');
    expect(formatDayOfYear(2026, 60)).toBe('1 March');
    expect(formatDayOfYear(0, 366)).toBe('31 December');
  });
});
