import { MODEL_CONDITIONS, SCENE_LAYERS, SCENE_VIEWS, SceneStateV1 } from './actions';
import type { SceneState } from './state';

// Shareable scene links. Readable query parameters, versioned with `v`:
//   ?v=1&year=-2559&day=172&hour=21.5&layers=labels,skyDome&focus=great-pyramid-center&model=as_built&view=sky
// Unknown or invalid parameters fall back to the current state's values.

export function sceneToSearchParams(state: SceneState): URLSearchParams {
  const p = new URLSearchParams();
  p.set('v', '1');
  p.set('year', String(state.epoch));
  p.set('day', String(state.sky.dayOfYear));
  p.set('hour', String(Math.round(state.sky.solarHour * 100) / 100));
  p.set('layers', SCENE_LAYERS.filter((l) => state.layers[l]).join(','));
  if (state.focus) p.set('focus', state.focus);
  if (state.target) p.set('target', state.target);
  p.set('model', state.condition);
  if (state.view !== 'overview') p.set('view', state.view);
  return p;
}

export function sceneFromSearchParams(params: URLSearchParams, fallback: SceneState): SceneState {
  if (params.get('v') !== '1') return fallback;
  const num = (key: string) => {
    const raw = params.get(key);
    return raw === null || raw.trim() === '' ? undefined : Number(raw);
  };
  const layerList = params.get('layers');
  const layers =
    layerList === null
      ? fallback.layers
      : Object.fromEntries(SCENE_LAYERS.map((l) => [l, layerList.split(',').includes(l)]));
  const model = params.get('model');
  const view = params.get('view');

  const candidate = {
    ...fallback,
    epoch: num('year') ?? fallback.epoch,
    layers,
    focus: params.get('focus') ?? fallback.focus,
    target: params.get('target') ?? fallback.target,
    sky: {
      dayOfYear: num('day') ?? fallback.sky.dayOfYear,
      solarHour: num('hour') ?? fallback.sky.solarHour,
    },
    condition: (MODEL_CONDITIONS as readonly string[]).includes(model ?? '')
      ? (model as SceneState['condition'])
      : fallback.condition,
    view: (SCENE_VIEWS as readonly string[]).includes(view ?? '')
      ? (view as SceneState['view'])
      : 'overview',
  };
  const parsed = SceneStateV1.safeParse(candidate);
  if (!parsed.success) return fallback;
  return { ...fallback, ...parsed.data } as SceneState;
}
