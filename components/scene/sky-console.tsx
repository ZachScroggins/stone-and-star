'use client';

import { ChevronDown, Minus, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  formatDayOfYear,
  SEASON_EVENTS,
  seasonDayOfYear,
  type SeasonEvent,
} from '@/lib/astro/seasons';
import { solveSky } from '@/lib/astro/sky';
import { daysInYear } from '@/lib/astro/time';
import { cn } from '@/lib/utils';
import { formatYear, fromBce, fromCe } from '@/lib/years';

const DEG = Math.PI / 180;
/** 12000 BCE. */
export const EPOCH_MIN = -11999;
export const EPOCH_MAX = 2100;

interface Props {
  epoch: number;
  dayOfYear: number;
  solarHour: number;
  latDeg: number;
  lonDeg: number;
  sunAltDeg: number | null;
  onEpoch: (year: number) => void;
  onSkyTime: (t: { dayOfYear?: number; solarHour?: number }) => void;
}

function formatHour(h: number) {
  const total = Math.round(h * 60) % (24 * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Sky colour for a solar altitude, for the time track. Mirrors the dome's palette. */
function trackColor(altDeg: number) {
  if (altDeg > 6) return 'oklch(0.82 0.07 85)';
  if (altDeg > -1) return 'oklch(0.72 0.14 60)';
  if (altDeg > -7) return 'oklch(0.52 0.13 40)';
  if (altDeg > -13) return 'oklch(0.33 0.08 280)';
  if (altDeg > -18) return 'oklch(0.22 0.05 270)';
  return 'oklch(0.14 0.03 265)';
}

function YearInput({ epoch, onEpoch }: { epoch: number; onEpoch: (y: number) => void }) {
  const era: 'BCE' | 'CE' = epoch <= 0 ? 'BCE' : 'CE';
  const calendarYear = epoch <= 0 ? 1 - epoch : epoch;
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (value: string, nextEra = era) => {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1) return;
    const year = nextEra === 'BCE' ? fromBce(n) : fromCe(n);
    onEpoch(Math.min(EPOCH_MAX, Math.max(EPOCH_MIN, year)));
  };

  return (
    <div className="flex items-end gap-2 sm:gap-3">
      <label className="sr-only" htmlFor="epoch-year">
        Year
      </label>
      <input
        id="epoch-year"
        inputMode="numeric"
        value={draft ?? String(calendarYear)}
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
        onBlur={() => {
          if (draft !== null) commit(draft);
          setDraft(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        className="w-[4.6ch] min-w-0 bg-transparent tracking-normal sm:w-[4.8ch] font-display text-[2rem] leading-none sm:text-5xl font-semibold sm:tracking-wide text-[oklch(0.95_0.03_85)] tabular-nums outline-none focus-visible:underline focus-visible:decoration-[oklch(0.8_0.12_85)] focus-visible:underline-offset-8"
      />
      <ToggleGroup
        value={[era]}
        onValueChange={(v) => {
          const next = v[0] as 'BCE' | 'CE' | undefined;
          if (next && next !== era) commit(String(calendarYear), next);
        }}
        aria-label="Era"
        spacing={0}
        className="mb-1"
      >
        {(['BCE', 'CE'] as const).map((e) => (
          <ToggleGroupItem
            key={e}
            value={e}
            className="h-11 min-w-11 px-2 text-sm sm:px-2.5 text-[oklch(0.8_0.03_85)] data-pressed:bg-[oklch(0.95_0.03_85/0.14)] data-pressed:text-[oklch(0.97_0.02_85)]"
          >
            {e}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

export function SkyConsole(props: Props) {
  const { epoch, dayOfYear, solarHour, latDeg, lonDeg, sunAltDeg } = props;

  // Paint the time track with this date's sky: one sample per half hour.
  const gradient = useMemo(() => {
    const stops: string[] = [];
    for (let i = 0; i <= 48; i++) {
      const h = i / 2;
      const f = solveSky({ year: epoch, dayOfYear, solarHour: h, latDeg, lonDeg });
      stops.push(`${trackColor(f.sun.alt / DEG)} ${((h / 24) * 100).toFixed(1)}%`);
    }
    return `linear-gradient(to right, ${stops.join(', ')})`;
  }, [epoch, dayOfYear, latDeg, lonDeg]);

  const seasonDays = useMemo(
    () =>
      Object.fromEntries(
        (Object.keys(SEASON_EVENTS) as SeasonEvent[]).map((e) => [
          e,
          seasonDayOfYear(epoch, e, lonDeg),
        ])
      ) as Record<SeasonEvent, number>,
    [epoch, lonDeg]
  );
  const activeSeason = (Object.keys(seasonDays) as SeasonEvent[]).find(
    (e) => seasonDays[e] === dayOfYear
  );
  const maxDay = daysInYear(epoch);

  // On phones the year slider, day and seasons fold away so the scene stays visible.
  const [expanded, setExpanded] = useState(false);

  const nudge = (delta: number) =>
    props.onEpoch(Math.min(EPOCH_MAX, Math.max(EPOCH_MIN, epoch + delta)));

  return (
    <section
      aria-label="Sky date and time"
      data-theme="egypt"
      className="dark pointer-events-auto w-full rounded-2xl border border-white/10 bg-[oklch(0.16_0.012_60/0.78)] p-4 text-[oklch(0.9_0.02_85)] shadow-[0_20px_60px_-20px_rgb(0_0_0/0.7)] backdrop-blur-md sm:w-104 sm:p-5"
    >
      {/* Below about 340 px the nudge buttons wrap under the year instead of overflowing. */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <YearInput epoch={epoch} onEpoch={props.onEpoch} />
        <div className="ml-auto flex sm:gap-1">
          <button
            type="button"
            onClick={() => nudge(-100)}
            className="flex size-11 items-center justify-center rounded-lg text-sm text-[oklch(0.8_0.03_85)] hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[oklch(0.8_0.12_85)] focus-visible:outline-none"
            aria-label="100 years earlier"
          >
            <Minus className="size-4" aria-hidden />
            <span aria-hidden className="text-xs">
              100
            </span>
          </button>
          <button
            type="button"
            onClick={() => nudge(100)}
            className="flex size-11 items-center justify-center rounded-lg text-sm text-[oklch(0.8_0.03_85)] hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[oklch(0.8_0.12_85)] focus-visible:outline-none"
            aria-label="100 years later"
          >
            <Plus className="size-4" aria-hidden />
            <span aria-hidden className="text-xs">
              100
            </span>
          </button>
        </div>
      </div>

      <button
        type="button"
        aria-expanded={expanded}
        aria-controls="sky-console-more"
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 flex min-h-11 w-full items-center justify-between rounded-lg px-1 text-sm text-[oklch(0.82_0.03_85)] focus-visible:ring-2 focus-visible:ring-[oklch(0.8_0.12_85)] focus-visible:outline-none sm:hidden"
      >
        <span>
          <span className="font-heading text-lg">{formatDayOfYear(epoch, dayOfYear)}</span>
          <span className="text-[oklch(0.68_0.03_80)]"> {expanded ? 'Hide' : 'Change'} date</span>
        </span>
        <ChevronDown
          className={cn('size-4 transition-transform', expanded && 'rotate-180')}
          aria-hidden
        />
      </button>

      <div id="sky-console-more" className={cn(!expanded && 'hidden', 'sm:block')}>
        <Slider
          className="mt-4"
          aria-label="Year"
          min={EPOCH_MIN}
          max={EPOCH_MAX}
          step={1}
          value={[epoch]}
          onValueChange={(v) => props.onEpoch(Array.isArray(v) ? v[0] : v)}
        />
        <div className="mt-1.5 flex justify-between text-xs text-[oklch(0.68_0.03_80)] tabular-nums">
          <span>{formatYear(EPOCH_MIN)}</span>
          <span>{formatYear(EPOCH_MAX)}</span>
        </div>

        <div className="mt-5 flex items-baseline justify-between gap-3">
          <p className="hidden font-heading text-xl sm:block">
            {formatDayOfYear(epoch, dayOfYear)}
          </p>
          <label className="flex items-center gap-2 text-xs text-[oklch(0.68_0.03_80)]">
            Day
            <input
              type="number"
              min={1}
              max={maxDay}
              value={dayOfYear}
              onChange={(e) => {
                const d = Number(e.target.value);
                if (Number.isInteger(d) && d >= 1 && d <= maxDay) props.onSkyTime({ dayOfYear: d });
              }}
              className="h-9 w-16 rounded-md border border-white/15 bg-transparent px-2 text-sm text-[oklch(0.92_0.02_85)] tabular-nums focus-visible:ring-2 focus-visible:ring-[oklch(0.8_0.12_85)] focus-visible:outline-none"
            />
          </label>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {(Object.keys(SEASON_EVENTS) as SeasonEvent[]).map((e) => (
            <button
              key={e}
              type="button"
              aria-pressed={activeSeason === e}
              onClick={() => props.onSkyTime({ dayOfYear: seasonDays[e] })}
              className={cn(
                'min-h-11 rounded-lg border border-white/10 px-2 text-xs leading-tight text-[oklch(0.82_0.03_85)] hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[oklch(0.8_0.12_85)] focus-visible:outline-none',
                'aria-pressed:border-[oklch(0.8_0.12_85/0.6)] aria-pressed:bg-[oklch(0.8_0.12_85/0.14)] aria-pressed:text-[oklch(0.97_0.02_85)]'
              )}
            >
              {SEASON_EVENTS[e].label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between sm:mt-5">
        <p className="text-sm">
          <span className="font-heading text-xl tabular-nums">{formatHour(solarHour)}</span>{' '}
          <span className="text-[oklch(0.68_0.03_80)]">solar time</span>
        </p>
        {sunAltDeg !== null ? (
          <p className="text-xs text-[oklch(0.68_0.03_80)] tabular-nums">
            Sun{' '}
            {sunAltDeg >= 0 ? `${sunAltDeg.toFixed(0)}° up` : `${(-sunAltDeg).toFixed(0)}° down`}
          </p>
        ) : null}
      </div>
      <div className="relative mt-3">
        <div
          aria-hidden
          className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-full"
          style={{ background: gradient }}
        />
        <Slider
          aria-label="Local solar time"
          min={0}
          max={24}
          step={0.25}
          value={[solarHour]}
          onValueChange={(v) => props.onSkyTime({ solarHour: Array.isArray(v) ? v[0] : v })}
          className="relative **:data-[slot=slider-range]:bg-transparent **:data-[slot=slider-thumb]:size-5 **:data-[slot=slider-thumb]:border-2 **:data-[slot=slider-thumb]:border-[oklch(0.16_0.012_60)] **:data-[slot=slider-track]:h-3 **:data-[slot=slider-track]:bg-transparent"
        />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-[oklch(0.68_0.03_80)] tabular-nums">
        <span>00:00</span>
        <span>Noon</span>
        <span>24:00</span>
      </div>
    </section>
  );
}
