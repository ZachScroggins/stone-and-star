import { describe, expect, it } from 'vitest';

import { formatYear, fromBce, fromCe } from './years';

describe('years', () => {
  it('converts BCE to astronomical years', () => {
    expect(fromBce(1)).toBe(0);
    expect(fromBce(2)).toBe(-1);
    expect(fromBce(2560)).toBe(-2559);
  });

  it('keeps CE years unchanged', () => {
    expect(fromCe(1)).toBe(1);
    expect(fromCe(2026)).toBe(2026);
  });

  it('round-trips through formatYear', () => {
    expect(formatYear(fromBce(2560))).toBe('2560 BCE');
    expect(formatYear(fromBce(1))).toBe('1 BCE');
    expect(formatYear(fromCe(1))).toBe('1 CE');
  });

  it('rejects year zero, negatives and fractions', () => {
    expect(() => fromBce(0)).toThrow(RangeError);
    expect(() => fromCe(-5)).toThrow(RangeError);
    expect(() => fromBce(2.5)).toThrow(RangeError);
    expect(() => formatYear(1.5)).toThrow(RangeError);
  });
});
