import { describe, expect, it } from 'vitest';

import { SceneAction } from './actions';

describe('SceneAction', () => {
  it('accepts each action type', () => {
    const actions = [
      { type: 'setLayer', layer: 'skyDome', on: true },
      { type: 'setEpoch', year: -2559 },
      { type: 'focusCamera', anchor: 'great-pyramid-apex' },
      { type: 'highlight', targets: ['great-pyramid', 'khafre-pyramid'] },
      { type: 'selectTarget', targetKey: 'star:HIP-11767' },
      { type: 'openPanel', tab: 'views', size: 'phone' },
    ];
    for (const action of actions) {
      expect(SceneAction.safeParse(action).success).toBe(true);
    }
  });

  it('rejects unknown types, bad slugs and out-of-range values', () => {
    const bad = [
      { type: 'runCode', code: 'alert(1)' },
      { type: 'setLayer', layer: 'everything', on: true },
      { type: 'setEpoch', year: 1.5 },
      { type: 'focusCamera', anchor: 'Great Pyramid' },
      { type: 'highlight', targets: Array.from({ length: 7 }, (_, i) => `s-${i}`) },
      { type: 'selectTarget', targetKey: 'comet:x' },
    ];
    for (const action of bad) {
      expect(SceneAction.safeParse(action).success).toBe(false);
    }
  });
});
