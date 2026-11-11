import { describe, expect, it } from 'vitest';

import { fromBce } from '../years';
import { daysInYear, jdFromDayOfYear, jdFromGregorian, julianEpoch } from './time';

describe('jdFromGregorian', () => {
  it('J2000.0 is 2000-01-01 12:00', () => {
    expect(jdFromGregorian(2000, 1, 1) + 0.5).toBe(2451545.0);
  });

  it('JD 0 is proleptic Gregorian 4714 BCE November 24, 12:00', () => {
    expect(jdFromGregorian(fromBce(4714), 11, 24) + 0.5).toBe(0);
  });

  it('handles years before the algorithm offset', () => {
    // 365.2425 days per Gregorian year; 400-year cycles have exactly 146,097 days.
    expect(jdFromGregorian(-10000, 1, 1) - jdFromGregorian(-9600, 1, 1)).toBe(-146097);
  });

  it('day of year counts from January 1', () => {
    expect(jdFromDayOfYear(2024, 60)).toBe(jdFromGregorian(2024, 2, 29));
    expect(daysInYear(2024)).toBe(366);
    expect(daysInYear(1900)).toBe(365);
    expect(daysInYear(0)).toBe(366);
  });
});

describe('julianEpoch', () => {
  it('is 2000.0 at J2000', () => {
    expect(julianEpoch(2451545.0)).toBe(2000);
  });
});
