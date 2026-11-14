import { describe, expect, it } from 'vitest';

import { fromBce, fromCe } from '@/lib/years';

import { formatYearRange } from './format';

describe('formatYearRange', () => {
  it('shares the era across a range and marks approximate dates', () => {
    expect(formatYearRange(fromBce(2589), fromBce(2566), 'approximate')).toBe('c. 2589–2566 BCE');
    expect(formatYearRange(fromBce(2589), fromBce(2566), 'exact')).toBe('2589–2566 BCE');
  });

  it('gives a single year once', () => {
    expect(formatYearRange(fromBce(2560), fromBce(2560), 'approximate')).toBe('c. 2560 BCE');
  });

  it('spells out both eras when a range crosses year 1', () => {
    expect(formatYearRange(fromBce(50), fromCe(20), 'decade')).toBe('c. 50 BCE–20 CE');
  });
});
