'use client';

import { ArrowDown, ArrowUp, LocateFixed, RotateCcw, RotateCw } from 'lucide-react';
import type { KeyboardEvent, ReactNode } from 'react';

import type { WalkInput } from '@/lib/scene/walk';
import { cn } from '@/lib/utils';

type PadMove = 'forward' | 'back' | 'left' | 'right';

// Buttons held on the on-screen pad. The camera rig reads them every frame; they
// are transient input, not scene state, so they stay out of the store.
const held = new Set<PadMove>();

export function padWalkInput(): Pick<WalkInput, 'forward' | 'turn'> {
  return {
    forward: (held.has('forward') ? 1 : 0) - (held.has('back') ? 1 : 0),
    turn: (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0),
  };
}

export function releasePad() {
  held.clear();
}

function HoldButton({
  move,
  label,
  children,
}: {
  move: PadMove;
  label: string;
  children: ReactNode;
}) {
  const press = () => held.add(move);
  const release = () => held.delete(move);
  const onKey = (down: boolean) => (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (down) press();
    else release();
  };
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        press();
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onBlur={release}
      onKeyDown={onKey(true)}
      onKeyUp={onKey(false)}
      onContextMenu={(e) => e.preventDefault()}
      className="flex size-11 touch-none items-center justify-center rounded-full border border-white/15 bg-[oklch(0.16_0.012_60/0.7)] text-[oklch(0.9_0.02_85)] backdrop-blur-md transition-colors select-none hover:bg-[oklch(0.22_0.012_60/0.85)] focus-visible:ring-2 focus-visible:ring-[oklch(0.8_0.12_85)] focus-visible:outline-none active:bg-[oklch(0.8_0.12_85/0.3)]"
    >
      {children}
    </button>
  );
}

export interface SightReadout {
  name: string;
  distance: number;
  bearingDeg: number;
  elevationDeg: number;
}

/** Sky-view movement: a hold-to-walk pad, a reset, and where the viewer stands. */
export function WalkPad({
  sight,
  moved,
  onReset,
  className,
}: {
  sight: SightReadout | null;
  /** True once the viewer has left the default standpoint. */
  moved: boolean;
  onReset: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'pointer-events-none flex flex-col items-end gap-2 text-[oklch(0.9_0.02_85)]',
        className
      )}
    >
      <div role="group" aria-label="Walk" className="pointer-events-auto grid grid-cols-3 gap-1.5">
        <HoldButton move="left" label="Turn left">
          <RotateCcw aria-hidden className="size-4" />
        </HoldButton>
        <HoldButton move="forward" label="Walk forward">
          <ArrowUp aria-hidden className="size-5" />
        </HoldButton>
        <HoldButton move="right" label="Turn right">
          <RotateCw aria-hidden className="size-4" />
        </HoldButton>
        <button
          type="button"
          onClick={onReset}
          disabled={!moved}
          aria-label="Back to the starting point"
          title="Back to the starting point"
          className="flex size-11 items-center justify-center rounded-full border border-white/15 bg-[oklch(0.16_0.012_60/0.7)] backdrop-blur-md transition-colors hover:bg-[oklch(0.22_0.012_60/0.85)] focus-visible:ring-2 focus-visible:ring-[oklch(0.8_0.12_85)] focus-visible:outline-none disabled:opacity-40"
        >
          <LocateFixed aria-hidden className="size-4" />
        </button>
        <HoldButton move="back" label="Walk back">
          <ArrowDown aria-hidden className="size-5" />
        </HoldButton>
      </div>
      <div className="rounded-xl border border-white/10 bg-[oklch(0.16_0.012_60/0.7)] px-3 py-2 text-right text-xs leading-relaxed backdrop-blur-md">
        {sight ? (
          <p className="tabular-nums">
            {sight.name}: {Math.round(sight.distance)} m, bearing {Math.round(sight.bearingDeg)}°,
            apex {sight.elevationDeg.toFixed(1)}° up
          </p>
        ) : null}
        <p className="text-[oklch(0.72_0.03_80)] pointer-coarse:hidden">
          Drag to look · WASD or arrows to walk · scroll to step · Shift to run
        </p>
        <p className="hidden text-[oklch(0.72_0.03_80)] pointer-coarse:block">
          Drag to look · pinch to step
        </p>
      </div>
    </div>
  );
}
