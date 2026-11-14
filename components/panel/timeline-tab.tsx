'use client';

import type { Source } from '@/lib/contracts/claims';
import type { TimelineEvent } from '@/lib/contracts/timeline';
import { formatYearRange } from '@/lib/facts/format';
import type { DatePrecision } from '@/lib/vocab';
import { formatYear } from '@/lib/years';

import { cn } from '@/lib/utils';

import { PanelHeading, UnverifiedNote } from './labels';

const W = 100; // the axis is drawn in percent of the row width
const ROW_H = 14;
const DASH = '10 5';

/** A date range: solid when established, dashed when approximate. */
function RangeBar({ x0, x1, precision }: { x0: number; x1: number; precision: DatePrecision }) {
  const y = ROW_H / 2;
  return (
    <line
      x1={`${x0}%`}
      x2={`${Math.max(x1, x0 + 0.6)}%`}
      y1={y}
      y2={y}
      stroke="currentColor"
      strokeWidth={6}
      strokeLinecap={precision === 'approximate' ? 'butt' : 'round'}
      strokeDasharray={precision === 'approximate' ? DASH : undefined}
    />
  );
}

/** One date: a diamond, filled if exact, hollow if approximate. HTML keeps its shape at any width. */
function DiamondMark({ x, filled }: { x: number; filled: boolean }) {
  return (
    <span
      aria-hidden
      style={{ left: `${x}%` }}
      className={`absolute top-1/2 size-2.5 -translate-1/2 rotate-45 border-2 border-current ${filled ? 'bg-current' : 'bg-background'}`}
    />
  );
}

/**
 * Site events on one shared axis. Date precision is drawn, not just written, and a
 * "Sources disagree" block keeps every dating that differs.
 */
export function TimelineTab({ events, sources }: { events: TimelineEvent[]; sources: Source[] }) {
  if (events.length === 0) return null;
  const min = Math.min(...events.map((e) => e.start));
  const max = Math.max(...events.map((e) => e.end));
  const pad = Math.max(5, Math.round((max - min) * 0.06));
  const lo = min - pad;
  const hi = max + pad;
  const at = (year: number) => ((year - lo) / (hi - lo)) * W;
  const ticks = niceTicks(lo, hi);
  const sourceTitle = (slug?: string) => sources.find((s) => s.slug === slug)?.title;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <ol className="space-y-3">
          {events.map((e) => {
            const single = e.start === e.end;
            return (
              <li key={e.slug} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{e.title}</span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    {formatYearRange(e.start, e.end, e.precision)}
                  </span>
                </div>
                <div className="relative text-stone" style={{ height: ROW_H }}>
                  <svg
                    aria-hidden
                    width="100%"
                    height={ROW_H}
                    className="absolute inset-0 overflow-visible"
                  >
                    <line
                      x1="0"
                      x2="100%"
                      y1={ROW_H / 2}
                      y2={ROW_H / 2}
                      className="stroke-border"
                    />
                    {single ? null : (
                      <RangeBar x0={at(e.start)} x1={at(e.end)} precision={e.precision} />
                    )}
                  </svg>
                  {single ? <DiamondMark x={at(e.start)} filled={e.precision === 'exact'} /> : null}
                </div>
              </li>
            );
          })}
        </ol>
        <div aria-hidden className="relative h-5 text-xs text-muted-foreground tabular-nums">
          {ticks.map((t) => (
            <span
              key={t}
              style={{ left: `${at(t)}%` }}
              className={cn(
                'absolute whitespace-nowrap',
                at(t) > 88 ? '-translate-x-full' : at(t) < 12 ? '' : '-translate-x-1/2'
              )}
            >
              {formatYear(t)}
            </span>
          ))}
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <svg aria-hidden width="22" height="8" className="text-stone">
              <line
                x1="3"
                x2="19"
                y1="4"
                y2="4"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
              />
            </svg>
            Established range
          </li>
          <li className="flex items-center gap-1.5">
            <svg aria-hidden width="30" height="8" className="text-stone">
              <line
                x1="0"
                x2="30"
                y1="4"
                y2="4"
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray={DASH}
              />
            </svg>
            Approximate range
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="size-2 rotate-45 border-2 border-stone bg-stone" />
            Exact date
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="size-2 rotate-45 border-2 border-stone bg-background" />
            Approximate date
          </li>
        </ul>
      </div>

      {events.some((e) => e.alternatives.length > 0) ? (
        <section aria-labelledby="timeline-disagree" className="space-y-3">
          <PanelHeading id="timeline-disagree">Sources disagree</PanelHeading>
          {events
            .filter((e) => e.alternatives.length > 0)
            .map((e) => (
              <div key={e.slug} className="rounded-xl border border-border p-3 text-sm">
                <p className="font-medium">{e.title}</p>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                  <dt className="text-muted-foreground tabular-nums">
                    {formatYearRange(e.start, e.end, e.precision)}
                  </dt>
                  <dd>The dating shown on the timeline</dd>
                  {e.alternatives.map((a) => (
                    <div key={a.label} className="contents">
                      <dt className="text-muted-foreground tabular-nums">
                        {formatYearRange(a.start, a.end, a.precision)}
                      </dt>
                      <dd>
                        {a.label}
                        {sourceTitle(a.sourceSlug) ? (
                          <span className="text-muted-foreground">
                            {' '}
                            ({sourceTitle(a.sourceSlug)})
                          </span>
                        ) : null}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
        </section>
      ) : null}

      <section aria-labelledby="timeline-passages" className="space-y-2">
        <PanelHeading id="timeline-passages">Source passages</PanelHeading>
        <p className="text-sm/relaxed text-muted-foreground">
          Each date will show the verbatim passage it comes from, with the date highlighted. None
          are stored yet: passages arrive through the sourcing pipeline.
        </p>
      </section>

      {events.some((e) => e.unverified) ? <UnverifiedNote /> : null}
    </div>
  );
}

/** Round tick years (astronomical) across [lo, hi], about four of them. */
function niceTicks(lo: number, hi: number): number[] {
  const span = hi - lo;
  const raw = span / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  // Ticks sit on round BCE/CE labels: astronomical year 1 − n·step for BCE.
  const out: number[] = [];
  const first = Math.ceil((1 - hi) / step) * step;
  for (let bce = first; 1 - bce >= lo; bce += step) out.push(1 - bce);
  return out.toSorted((a, b) => a - b);
}
