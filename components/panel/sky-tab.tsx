'use client';

import { Telescope } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  countFittingCombinations,
  evaluateAlignment,
  nightCulmination,
  starOfDate,
  type StarRow,
} from '@/lib/astro/alignment';
import { hipFromTargetKey, type AlignmentHypothesis } from '@/lib/contracts/alignment';
import type { Claim } from '@/lib/contracts/claims';
import { formatYearRange } from '@/lib/facts/format';
import { formatYear } from '@/lib/years';

import { ClaimLabels, PanelHeading, UnverifiedNote } from './labels';

const DEG = Math.PI / 180;
/** Years either side of the claimed range that the plot shows. */
const MARGIN_YEARS = 1500;
const STEP_YEARS = 5;
const PLOT_LIMIT_DEG = 3;

export interface ShowInSky {
  year: number;
  dayOfYear: number;
  solarHour: number;
  headingDeg: number;
  pitchDeg: number;
}

const fmtDeg = (d: number) => `${d.toFixed(d % 1 === 0 ? 0 : 2).replace(/0$/, '')}°`;

function ErrorPlot({
  samples,
  from,
  to,
  tolerance,
  claimed,
}: {
  samples: { year: number; error: number | null }[];
  from: number;
  to: number;
  tolerance: number;
  claimed: [number, number];
}) {
  const x = (year: number) => ((year - from) / (to - from)) * 300;
  const y = (err: number) =>
    48 - (Math.max(-PLOT_LIMIT_DEG, Math.min(PLOT_LIMIT_DEG, err)) / PLOT_LIMIT_DEG) * 44;
  // Break the line where the star never reaches the axis.
  const segments: string[] = [];
  let current = '';
  for (const s of samples) {
    if (s.error === null) {
      if (current) segments.push(current);
      current = '';
      continue;
    }
    current += `${current ? 'L' : 'M'}${x(s.year).toFixed(1)},${y(s.error).toFixed(1)}`;
  }
  if (current) segments.push(current);
  const cx0 = x(claimed[0]);
  const cx1 = Math.max(x(claimed[1]), cx0 + 2);

  return (
    <figure className="space-y-1">
      <svg
        viewBox="0 0 300 96"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Difference between the axis and the star, ${formatYear(from)} to ${formatYear(to)}. The shaded band is the tolerance; the bracket is the claimed date range.`}
        className="h-28 w-full"
      >
        <rect
          x="0"
          y={y(tolerance)}
          width="300"
          height={y(-tolerance) - y(tolerance)}
          className="fill-star/25"
        />
        <line
          x1="0"
          x2="300"
          y1="48"
          y2="48"
          className="stroke-border"
          vectorEffect="non-scaling-stroke"
        />
        <rect x={cx0} y="0" width={cx1 - cx0} height="96" className="fill-foreground/10" />
        {segments.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            className="stroke-star"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <figcaption className="flex justify-between text-xs text-muted-foreground tabular-nums">
        <span>{formatYear(from)}</span>
        <span>±{PLOT_LIMIT_DEG}° shown</span>
        <span>{formatYear(to)}</span>
      </figcaption>
    </figure>
  );
}

/**
 * The alignment test: a structure axis against a star, with the tolerance, horizon
 * and refraction as visible assumptions. The result is a range of years, and how many
 * assumption sets still fit: a match that holds for centuries dates nothing on its own.
 */
export function SkyTab({
  alignments,
  claims,
  stars,
  latDeg,
  lonDeg,
  onShow,
}: {
  alignments: AlignmentHypothesis[];
  claims: Claim[];
  /** Catalog rows by HIP number; null while the catalog loads. */
  stars: Map<number, StarRow> | null;
  latDeg: number;
  lonDeg: number;
  onShow: (view: ShowInSky) => void;
}) {
  const [selected, setSelected] = useState(alignments[0]?.slug ?? null);
  const [tolerance, setTolerance] = useState(0.5);
  const [horizonDeg, setHorizonDeg] = useState(0);
  const [refraction, setRefraction] = useState(true);
  const h = alignments.find((a) => a.slug === selected) ?? alignments[0];
  const hip = h ? hipFromTargetKey(h.targetKey) : null;
  const row = hip !== null ? (stars?.get(hip) ?? null) : null;
  const claim = claims.find((c) => c.slug === h?.claimSlug);

  const range = h
    ? { from: h.epochStart - MARGIN_YEARS, to: h.epochEnd + MARGIN_YEARS, step: STEP_YEARS }
    : null;
  const result = useMemo(() => {
    if (!h || !row || !range) return null;
    const a = { axisDeg: h.axisDeg, toleranceDeg: tolerance, horizonDeg, refraction };
    return {
      fit: evaluateAlignment(h, row, latDeg, a, range),
      combos: countFittingCombinations(h, row, latDeg, tolerance),
    };
    // `range` is derived from `h`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h, row, latDeg, tolerance, horizonDeg, refraction]);

  if (!h || !range) return null;

  const show = () => {
    if (!row || !result) return;
    const year = result.fit.best?.year ?? h.epochStart;
    const { ra, dec } = starOfDate(row, year);
    const night = nightCulmination(year, ra, latDeg, lonDeg);
    let solarHour = night.solarHour;
    let headingDeg = h.meridian === 'north' ? 0 : 180;
    let pitchDeg = h.axisDeg;
    if (h.kind !== 'culmination') {
      // Hour angle at the horizon: the star rises that long before it culminates.
      const cosH =
        (Math.sin(horizonDeg * DEG) - Math.sin(latDeg * DEG) * Math.sin(dec)) /
        (Math.cos(latDeg * DEG) * Math.cos(dec));
      const hours = Math.acos(Math.max(-1, Math.min(1, cosH))) / DEG / 15;
      solarHour = (((night.solarHour + (h.kind === 'rising' ? -hours : hours)) % 24) + 24) % 24;
      headingDeg = h.axisDeg;
      pitchDeg = Math.max(2, horizonDeg + 2);
    }
    onShow({
      year,
      dayOfYear: night.dayOfYear,
      solarHour: Math.round(solarHour * 4) / 4,
      headingDeg,
      pitchDeg,
    });
  };

  return (
    <div className="space-y-6">
      {alignments.length > 1 ? (
        <nav aria-label="Alignments">
          <ul className="flex flex-wrap gap-2">
            {alignments.map((a) => (
              <li key={a.slug}>
                <button
                  type="button"
                  aria-pressed={a.slug === h.slug}
                  onClick={() => setSelected(a.slug)}
                  className="min-h-11 rounded-full border border-border px-3.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-pressed:border-star/80 aria-pressed:bg-star/20 aria-pressed:text-foreground"
                >
                  {a.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <div className="space-y-2">
        <h2 className="font-heading text-2xl/tight font-semibold">{h.title}</h2>
        <p className="text-sm/relaxed">
          Does the <span className="text-stone">{h.axisLabel}</span> ({fmtDeg(h.axisDeg)} ±{' '}
          {fmtDeg(h.axisUncertaintyDeg)}{' '}
          {h.kind === 'culmination' ? `above the ${h.meridian} horizon` : 'azimuth'}) point at{' '}
          <span className="text-star">{h.targetName}</span>{' '}
          {h.kind === 'culmination'
            ? 'as it crosses the meridian'
            : `as it ${h.kind === 'rising' ? 'rises' : 'sets'}`}
          ? Claimed date: {formatYearRange(h.epochStart, h.epochEnd, 'approximate')}.
        </p>
      </div>

      <section aria-labelledby="sky-assumptions" className="space-y-4">
        <PanelHeading id="sky-assumptions">Assumptions</PanelHeading>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between text-sm">
            <label id="sky-tolerance-label" htmlFor="sky-tolerance">
              Tolerance
            </label>
            <span className="tabular-nums">±{tolerance.toFixed(1)}°</span>
          </div>
          <Slider
            id="sky-tolerance"
            aria-labelledby="sky-tolerance-label"
            min={0.1}
            max={2}
            step={0.1}
            value={[tolerance]}
            onValueChange={(v) => setTolerance(Array.isArray(v) ? v[0] : v)}
          />
        </div>
        {h.kind !== 'culmination' ? (
          <div className="flex items-center justify-between gap-3 text-sm">
            <span id="sky-horizon-label">Horizon height</span>
            <ToggleGroup
              aria-labelledby="sky-horizon-label"
              value={[String(horizonDeg)]}
              onValueChange={(v) => v[0] && setHorizonDeg(Number(v[0]))}
              spacing={1}
            >
              {[0, 0.5, 1].map((d) => (
                <ToggleGroupItem
                  key={d}
                  value={String(d)}
                  className="h-11 min-w-11 rounded-full border border-border px-3 data-pressed:border-star/80 data-pressed:bg-star/20"
                >
                  {d}°
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        ) : null}
        <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
          Atmospheric refraction
          <input
            type="checkbox"
            checked={refraction}
            onChange={(e) => setRefraction(e.target.checked)}
            className="size-5 accent-(--star)"
          />
        </label>
      </section>

      <section aria-labelledby="sky-result" aria-live="polite" className="space-y-3">
        <PanelHeading id="sky-result">Result</PanelHeading>
        {!result ? (
          <p className="text-sm text-muted-foreground">
            {stars ? `${h.targetName} is not in the star catalog.` : 'Loading the star catalog…'}
          </p>
        ) : (
          <>
            <p className="text-sm/relaxed">
              {result.fit.fits.length === 0
                ? `Within ±${tolerance.toFixed(1)}°, the star never lines up with the axis between ${formatYear(range.from)} and ${formatYear(range.to)}.`
                : `Within ±${tolerance.toFixed(1)}°, it lines up ${result.fit.fits
                    .map((f) => formatYearRange(f.start, f.end, 'approximate').replace(/^c\. /, ''))
                    .join(' and ')}. ${
                    result.fit.fitsClaimedRange
                      ? 'That includes the claimed date.'
                      : 'That misses the claimed date.'
                  }`}
            </p>
            <ErrorPlot
              samples={result.fit.samples}
              from={range.from}
              to={range.to}
              tolerance={tolerance}
              claimed={[h.epochStart, h.epochEnd]}
            />
            <p className="text-sm/relaxed">
              <span className="font-heading text-2xl font-semibold tabular-nums">
                {result.combos.fit} of {result.combos.total}
              </span>{' '}
              assumption sets still fit within the claimed date (axis at its low, stated and high
              value{h.kind === 'culmination' ? '' : ', three horizon heights'}, refraction on or
              off).
            </p>
            <p className="text-xs/relaxed text-muted-foreground">
              Precession moves a star slowly, so a match usually holds for centuries. On its own, an
              alignment is weak evidence for any date.
            </p>
            <button
              type="button"
              onClick={show}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-star/70 px-4 text-sm font-medium hover:bg-star/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Telescope aria-hidden className="size-4" />
              Show in sky ({formatYear(result.fit.best?.year ?? h.epochStart)})
            </button>
          </>
        )}
      </section>

      {claim ? (
        <section aria-labelledby="sky-claim" className="space-y-2">
          <PanelHeading id="sky-claim">The claim</PanelHeading>
          <p className="text-sm/relaxed">{claim.statement}</p>
          <ClaimLabels reception={claim.reception} basis={claim.basis} />
        </section>
      ) : null}

      {h.unverified ? (
        <UnverifiedNote>
          Placeholder: the shaft angle and its uncertainty are commonly quoted round figures, not
          yet sourced. The star positions and the test itself are computed.
        </UnverifiedNote>
      ) : null}
    </div>
  );
}
