import { SCENE_LAYERS, type SceneAction, type SceneStateV1 } from './actions';

/** Scene state with every M2 field resolved. Serialized as SceneStateV1. */
export type SceneState = Required<SceneStateV1>;

export const DEFAULT_LAYERS: SceneState['layers'] = {
  dimensions: false,
  alignment: false,
  skyDome: false,
  labels: true,
};

/** Initial state. Callers pass the current date so the default sky is tonight's. */
export function initialSceneState(now: { year: number; dayOfYear: number }): SceneState {
  return {
    v: 1,
    layers: { ...DEFAULT_LAYERS },
    epoch: now.year,
    focus: null,
    highlights: [],
    target: null,
    panel: { tab: 'facts', size: 'icon' },
    sky: { dayOfYear: now.dayOfYear, solarHour: 21 },
    condition: 'surviving',
    view: 'overview',
  };
}

/** Pure reducer: every scene change, from UI controls or the guide, goes through here. */
export function reduceScene(state: SceneState, action: SceneAction): SceneState {
  switch (action.type) {
    case 'setLayer':
      return { ...state, layers: { ...state.layers, [action.layer]: action.on } };
    case 'setEpoch':
      return { ...state, epoch: action.year };
    case 'focusCamera':
      return { ...state, focus: action.anchor };
    case 'highlight':
      return { ...state, highlights: [...action.targets] };
    case 'selectTarget':
      return { ...state, target: action.targetKey };
    case 'openPanel':
      return { ...state, panel: { tab: action.tab, size: action.size ?? state.panel.size } };
    case 'setSkyTime':
      return {
        ...state,
        sky: {
          dayOfYear: action.dayOfYear ?? state.sky.dayOfYear,
          solarHour: action.solarHour ?? state.sky.solarHour,
        },
      };
    case 'setModelCondition':
      return { ...state, condition: action.condition };
    case 'setView':
      return { ...state, view: action.view };
  }
}

export { SCENE_LAYERS };
