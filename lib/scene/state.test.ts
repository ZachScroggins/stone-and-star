import { describe, expect, it } from 'vitest';

import { initialSceneState, reduceScene } from './state';
import { sceneFromSearchParams, sceneToSearchParams } from './url';

const base = initialSceneState({ year: 2026, dayOfYear: 315 });

describe('reduceScene', () => {
  it('applies each action', () => {
    let s = reduceScene(base, { type: 'setLayer', layer: 'skyDome', on: true });
    expect(s.layers.skyDome).toBe(true);
    s = reduceScene(s, { type: 'setEpoch', year: -2559 });
    expect(s.epoch).toBe(-2559);
    s = reduceScene(s, { type: 'setSkyTime', solarHour: 4.5 });
    expect(s.sky).toEqual({ dayOfYear: 315, solarHour: 4.5 });
    s = reduceScene(s, { type: 'setModelCondition', condition: 'as_built' });
    expect(s.condition).toBe('as_built');
    s = reduceScene(s, { type: 'focusCamera', anchor: 'khafre-pyramid-center' });
    expect(s.focus).toBe('khafre-pyramid-center');
    s = reduceScene(s, { type: 'openPanel', tab: 'sky' });
    expect(s.panel).toEqual({ tab: 'sky', size: 'icon' });
  });

  it('does not mutate the previous state', () => {
    reduceScene(base, { type: 'setLayer', layer: 'dimensions', on: true });
    expect(base.layers.dimensions).toBe(false);
  });
});

describe('scene URL state', () => {
  it('round-trips', () => {
    const s = {
      ...base,
      epoch: -2559,
      sky: { dayOfYear: 172, solarHour: 21.25 },
      layers: { ...base.layers, skyDome: true },
      focus: 'great-pyramid-center',
      condition: 'as_built' as const,
      view: 'sky' as const,
    };
    const params = new URLSearchParams(sceneToSearchParams(s).toString());
    expect(sceneFromSearchParams(params, base)).toEqual(s);
  });

  it('falls back on invalid or unversioned input', () => {
    expect(sceneFromSearchParams(new URLSearchParams('year=-2559'), base)).toBe(base);
    expect(sceneFromSearchParams(new URLSearchParams('v=1&year=1.5'), base)).toBe(base);
    expect(sceneFromSearchParams(new URLSearchParams('v=1&focus=Not A Slug'), base)).toBe(base);
    expect(sceneFromSearchParams(new URLSearchParams('v=1&hour=99'), base)).toBe(base);
  });
});
