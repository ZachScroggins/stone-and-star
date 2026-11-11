import { Box3 } from 'three';
import { describe, expect, it } from 'vitest';

import { buildPyramid } from './pyramid';

describe('buildPyramid', () => {
  it('builds an as-built pyramid with the given base and apex height', () => {
    const g = buildPyramid({ baseSide: 230, height: 146, casing: true });
    const box = new Box3().setFromBufferAttribute(g.getAttribute('position') as never);
    expect(box.min.x).toBeCloseTo(-115);
    expect(box.max.z).toBeCloseTo(115);
    expect(box.min.y).toBe(0);
    expect(box.max.y).toBeCloseTo(146);
  });

  it('stops a surviving pyramid at its surviving height, inside the casing line', () => {
    const g = buildPyramid({ baseSide: 230, height: 146, topHeight: 138, casing: false });
    const box = new Box3().setFromBufferAttribute(g.getAttribute('position') as never);
    expect(box.max.y).toBeCloseTo(138);
    expect(box.max.x).toBeLessThan(115);
  });

  it('faces every triangle outward or up', () => {
    const g = buildPyramid({ baseSide: 100, height: 60, topHeight: 50, casing: false });
    const n = g.getAttribute('normal');
    for (let i = 0; i < n.count; i++) expect(n.getY(i)).toBeGreaterThanOrEqual(-1e-6);
  });
});
