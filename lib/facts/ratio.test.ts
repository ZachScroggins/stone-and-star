import { describe, expect, it } from 'vitest';

import { formatRatio, ratioOf } from './ratio';

describe('ratioOf', () => {
  it('divides the reference by the measurement', () => {
    // WGS84 polar radius over a 146.6 m height.
    const r = ratioOf(6_356_752.314, 146.6);
    expect(r.value).toBeCloseTo(43_361.2, 1);
    expect(r.nearestWhole).toBe(43_361);
    expect(r.offFromWhole).toBeLessThan(1e-5);
  });

  it('rejects zero, negative and non-numeric lengths', () => {
    expect(() => ratioOf(1, 0)).toThrow(RangeError);
    expect(() => ratioOf(-1, 2)).toThrow(RangeError);
    expect(() => ratioOf(Number.NaN, 2)).toThrow(RangeError);
  });
});

describe('formatRatio', () => {
  it('rounds to significant figures with separators', () => {
    expect(formatRatio(43_361.234)).toBe('43,361');
    expect(formatRatio(1.570796, 4)).toBe('1.571');
  });
});
