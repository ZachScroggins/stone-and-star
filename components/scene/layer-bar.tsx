'use client';

import type { SceneState } from '@/lib/scene/state';
import { cn } from '@/lib/utils';

const LAYERS = [
  { key: 'labels', label: 'Names' },
  { key: 'dimensions', label: 'Dimensions' },
  { key: 'constellations', label: 'Constellations' },
  { key: 'skyDome', label: 'Sky grid' },
] as const;

const chip =
  'min-h-11 rounded-full border px-4 text-sm whitespace-nowrap backdrop-blur-md transition-colors focus-visible:ring-2 focus-visible:ring-[oklch(0.8_0.12_85)] focus-visible:outline-none';
const off =
  'border-white/15 bg-[oklch(0.16_0.012_60/0.6)] text-[oklch(0.82_0.03_85)] hover:bg-[oklch(0.16_0.012_60/0.8)]';
const on =
  'border-[oklch(0.8_0.12_85/0.7)] bg-[oklch(0.8_0.12_85/0.22)] text-[oklch(0.97_0.02_85)]';

export function LayerBar({
  state,
  hasSurviving,
  onLayer,
  onCondition,
  onView,
}: {
  state: SceneState;
  hasSurviving: boolean;
  onLayer: (layer: (typeof LAYERS)[number]['key'], on: boolean) => void;
  onCondition: (c: SceneState['condition']) => void;
  onView: (v: SceneState['view']) => void;
}) {
  return (
    <div className="pointer-events-auto flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
      <div role="group" aria-label="View" className="flex gap-2">
        {(
          [
            ['overview', 'Overview'],
            ['sky', 'Stand and look up'],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            aria-pressed={state.view === v}
            onClick={() => onView(v)}
            className={cn(chip, state.view === v ? on : off)}
          >
            {label}
          </button>
        ))}
      </div>
      <span aria-hidden className="w-px shrink-0 bg-white/20" />
      <div role="group" aria-label="Layers" className="flex gap-2">
        {LAYERS.map((l) => (
          <button
            key={l.key}
            type="button"
            aria-pressed={state.layers[l.key]}
            onClick={() => onLayer(l.key, !state.layers[l.key])}
            className={cn(chip, state.layers[l.key] ? on : off)}
          >
            {l.label}
          </button>
        ))}
      </div>
      {hasSurviving ? <span aria-hidden className="w-px shrink-0 bg-white/20" /> : null}
      {hasSurviving ? (
        <div role="group" aria-label="Pyramids shown" className="flex gap-2">
          {(
            [
              ['surviving', 'As they stand'],
              ['as_built', 'As built'],
            ] as const
          ).map(([c, label]) => (
            <button
              key={c}
              type="button"
              aria-pressed={state.condition === c}
              onClick={() => onCondition(c)}
              className={cn(chip, state.condition === c ? on : off)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
