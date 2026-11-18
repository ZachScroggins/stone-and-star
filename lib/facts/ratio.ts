// Ratios between a reference constant and a measurement, for the Facts tab.
// Inputs are stored values only (never free-form expressions); nothing here is stored.

export interface Ratio {
  /** reference ÷ measurement */
  value: number;
  /** The nearest whole number, and how far the ratio is from it (fraction of it). */
  nearestWhole: number;
  offFromWhole: number;
}

export function ratioOf(referenceM: number, measurementM: number): Ratio {
  if (!(referenceM > 0) || !(measurementM > 0)) {
    throw new RangeError('Ratios need two positive lengths');
  }
  const value = referenceM / measurementM;
  const nearestWhole = Math.round(value);
  return { value, nearestWhole, offFromWhole: Math.abs(value - nearestWhole) / nearestWhole };
}

/** A ratio rounded for display: no more significant figures than the inputs justify. */
export function formatRatio(value: number, significant = 5): string {
  return Number(value.toPrecision(significant)).toLocaleString('en-US');
}
