'use client';

import { create } from 'zustand';

import { SceneAction } from './actions';
import { initialSceneState, reduceScene, type SceneState } from './state';

const LOG_LIMIT = 50;

interface SceneStore {
  state: SceneState;
  /** Most recent actions, newest last. Basis for undo and the guide's activity trace. */
  log: SceneAction[];
  /** Validates, then applies. Returns false (and changes nothing) for an invalid action. */
  dispatch: (action: unknown) => boolean;
  replace: (state: SceneState) => void;
}

function today() {
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), 0, 1);
  return {
    year: now.getUTCFullYear(),
    dayOfYear: Math.floor((now.getTime() - start) / 86_400_000) + 1,
  };
}

export const useSceneStore = create<SceneStore>((set) => ({
  state: initialSceneState(today()),
  log: [],
  dispatch: (raw) => {
    const parsed = SceneAction.safeParse(raw);
    if (!parsed.success) return false;
    set((s) => ({
      state: reduceScene(s.state, parsed.data),
      log: [...s.log, parsed.data].slice(-LOG_LIMIT),
    }));
    return true;
  },
  replace: (state) => set({ state }),
}));
