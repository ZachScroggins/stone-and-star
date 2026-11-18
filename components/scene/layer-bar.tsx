'use client';

import type { SceneState } from '@/lib/scene/state';
import { useEdgeFade } from '@/lib/use-edge-fade';
import { cn } from '@/lib/utils';

const LAYERS = [
  { key: 'labels', label: 'Names' },
  { key: 'dimensions', label: 'Dimensions' },
  { key: 'constellations', label: 'Constellations' },
  { key: 'skyDome', label: 'Sky grid' },
] as const;

const chip =
  'min-h-11 rounded-full border px-4 text-sm whitespace-nowrap backdrop-blur-md transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';
const off = 'border-foreground/15 bg-background/60 text-foreground/80 hover:bg-background/85';
const on = 'border-primary/70 bg-selected text-foreground';

export function LayerBar({
  state,
  hasSurviving,
  onLayer,
  onCondition,
  onView,
  className,
}: {
  state: SceneState;
  hasSurviving: boolean;
  onLayer: (layer: (typeof LAYERS)[number]['key'], on: boolean) => void;
  onCondition: (c: SceneState['condition']) => void;
  onView: (v: SceneState['view']) => void;
  className?: string;
}) {
  // Centred while it fits; scrolls from the left edge, fading, when it doesn't.
  const [scrollerRef, fade] = useEdgeFade<HTMLDivElement>();
  return (
    <div
      ref={scrollerRef}
      style={fade}
      className={cn('pointer-events-auto overflow-x-auto pb-1 scrollbar-none', className)}
    >
      <div className="mx-auto flex w-max gap-2">
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
        <span aria-hidden className="w-px shrink-0 bg-foreground/20" />
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
        {hasSurviving ? <span aria-hidden className="w-px shrink-0 bg-foreground/20" /> : null}
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
    </div>
  );
}
