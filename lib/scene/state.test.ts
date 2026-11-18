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
    const at = { lat: 29.976, lon: 31.137, heading: 300, pitch: 20 };
    s = reduceScene(s, { type: 'setStandpoint', standpoint: at });
    expect(s.standpoint).toEqual(at);
    s = reduceScene(s, { type: 'setStandpoint', standpoint: null });
    expect(s.standpoint).toBeNull();
  });

  it('opens the coincidence explorer in the expanded Facts tab, and closes it', () => {
    let s = reduceScene(base, { type: 'openExplorer', pattern: 'height-times-43200-polar-radius' });
    expect(s.explorer).toEqual({ pattern: 'height-times-43200-polar-radius' });
    expect(s.panel).toEqual({ tab: 'facts', size: 'full' });
    s = reduceScene(s, { type: 'openExplorer' });
    expect(s.explorer).toEqual({ pattern: null });
    s = reduceScene(s, { type: 'closeExplorer' });
    expect(s.explorer).toBeNull();
    expect(s.panel).toEqual({ tab: 'facts', size: 'full' });
  });

  it('merges explorer settings, and a new pattern starts a fresh search', () => {
    let s = reduceScene(base, { type: 'setExplorer', settings: { tolerance: 0.01 } });
    // Setting a search opens the explorer.
    expect(s.explorer).toEqual({ pattern: null, settings: { tolerance: 0.01 } });
    s = reduceScene(s, { type: 'setExplorer', settings: { shiftDecimal: false } });
    expect(s.explorer?.settings).toEqual({ tolerance: 0.01, shiftDecimal: false });
    // `undefined` returns a field to its default.
    s = reduceScene(s, { type: 'setExplorer', settings: { tolerance: undefined } });
    expect(s.explorer?.settings).toEqual({ shiftDecimal: false });
    s = reduceScene(s, { type: 'openExplorer', pattern: 'height-times-43200-polar-radius' });
    expect(s.explorer).toEqual({ pattern: 'height-times-43200-polar-radius' });
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
      standpoint: { lat: 29.976012, lon: 31.137021, heading: 297.5, pitch: 18.2 },
      panel: { tab: 'views' as const, size: 'phone' as const },
    };
    const params = new URLSearchParams(sceneToSearchParams(s).toString());
    expect(params.get('at')).toBe('29.976012,31.137021');
    expect(params.get('look')).toBe('297.5,18.2');
    expect(params.get('panel')).toBe('views.phone');
    expect(sceneFromSearchParams(params, base)).toEqual(s);
  });

  it('round-trips the coincidence explorer', () => {
    for (const explorer of [{ pattern: 'height-times-43200-polar-radius' }, { pattern: null }]) {
      const s = { ...base, explorer, panel: { tab: 'facts' as const, size: 'full' as const } };
      const params = sceneToSearchParams(s);
      expect(params.get('explorer')).toBe('1');
      expect(sceneFromSearchParams(params, base)).toEqual(s);
    }
    expect(sceneToSearchParams(base).has('explorer')).toBe(false);

    const settings = {
      structures: ['great-pyramid', 'khafre-pyramid'],
      lengths: ['height' as const],
      conditions: ['as_built' as const],
      references: [],
      pairings: ['reference-over-length' as const, 'length-over-length' as const],
      targets: ['claim', 'precession'],
      shiftDecimal: false,
      tolerance: 0.003734,
    };
    const s = {
      ...base,
      explorer: { pattern: 'height-times-43200-polar-radius', settings },
      panel: { tab: 'facts' as const, size: 'full' as const },
    };
    const params = new URLSearchParams(sceneToSearchParams(s).toString());
    expect(params.get('structures')).toBe('great-pyramid,khafre-pyramid');
    expect(params.get('constants')).toBe('');
    expect(params.get('decimal')).toBe('fixed');
    expect(params.get('tol')).toBe('0.003734');
    expect(sceneFromSearchParams(params, base)).toEqual(s);
    // Unset fields stay out of the link.
    const plain = sceneToSearchParams({ ...s, explorer: { pattern: null, settings: {} } });
    const settingKeys = ['structures', 'lengths', 'conditions', 'constants', 'ratios', 'numbers'];
    expect([...plain.keys()].filter((k) => [...settingKeys, 'decimal', 'tol'].includes(k))).toEqual(
      []
    );
    // A closed explorer ignores search parameters.
    expect(
      sceneFromSearchParams(new URLSearchParams('v=1&structures=great-pyramid'), base).explorer
    ).toBeNull();
    // An invalid setting rejects the link, like any other bad parameter.
    expect(sceneFromSearchParams(new URLSearchParams('v=1&explorer=1&tol=5'), base)).toBe(base);
    expect(sceneFromSearchParams(new URLSearchParams('v=1'), base).explorer).toBeNull();
  });

  it('reads links from before the standpoint and constellations were added', () => {
    const s = sceneFromSearchParams(
      new URLSearchParams('v=1&year=-2559&layers=labels,skyDome&view=sky'),
      base
    );
    expect(s.standpoint).toBeNull();
    expect(s.layers.constellations).toBe(false);
    expect(s.layers.skyDome).toBe(true);
    expect(s.view).toBe('sky');
  });

  it('defaults the look direction and rejects an out-of-range standpoint', () => {
    const s = sceneFromSearchParams(new URLSearchParams('v=1&at=29.97,31.13'), base);
    expect(s.standpoint).toEqual({ lat: 29.97, lon: 31.13, heading: 315, pitch: 25 });
    expect(sceneFromSearchParams(new URLSearchParams('v=1&at=99,31.13'), base)).toBe(base);
  });

  it('falls back on invalid or unversioned input', () => {
    expect(sceneFromSearchParams(new URLSearchParams('year=-2559'), base)).toBe(base);
    expect(sceneFromSearchParams(new URLSearchParams('v=1&year=1.5'), base)).toBe(base);
    expect(sceneFromSearchParams(new URLSearchParams('v=1&focus=Not A Slug'), base)).toBe(base);
    expect(sceneFromSearchParams(new URLSearchParams('v=1&hour=99'), base)).toBe(base);
  });
});
