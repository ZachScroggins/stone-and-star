'use client';

import { ArrowLeft } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { ReferenceQuantity } from '@/lib/contracts/alignment';
import type { Claim, Proponent } from '@/lib/contracts/claims';
import {
  type ExplorerSettings,
  LENGTH_QUANTITIES,
  type LengthQuantity,
  type NumericalPattern,
  type PatternTerm,
} from '@/lib/contracts/coincidence';
import type { Measurement, Structure } from '@/lib/contracts/site';
import {
  analyze,
  type Candidate,
  type CandidateSpace,
  enumerateCandidates,
  fullSpace,
  lengthsFrom,
  logWindow,
  type Pairing,
  resolveSettings,
  TARGET_FAMILIES,
  testPattern,
} from '@/lib/facts/coincidence';
import { CONDITION_LABELS } from '@/lib/facts/format';
import { formatRatio } from '@/lib/facts/ratio';
import { cn } from '@/lib/utils';
import type { MeasurementCondition } from '@/lib/vocab';

import { ClaimLabels, PanelHeading, UnverifiedNote } from './labels';

const LENGTH_LABELS: Record<LengthQuantity, string> = {
  height: 'height',
  'base-side-length': 'base side',
  perimeter: 'perimeter',
  'half-base': 'half base',
  'base-diagonal': 'base diagonal',
  'slant-height': 'slant height',
};

const PAIRING_LABELS: Record<Pairing, string> = {
  'reference-over-length': 'Constant ÷ length',
  'length-over-length': 'Length ÷ length',
};

/** The tolerance slider runs on a log scale from 0.01 % to 10 %. */
const TOL_MIN_LOG = -4;
const TOL_MAX_LOG = -1;
const toSlider = (t: number) =>
  ((Math.log10(t) - TOL_MIN_LOG) / (TOL_MAX_LOG - TOL_MIN_LOG)) * 1000;
const fromSlider = (s: number) => 10 ** (TOL_MIN_LOG + (s / 1000) * (TOL_MAX_LOG - TOL_MIN_LOG));

/** A fraction as a percentage with two significant figures: 0.37 %, 35 %, 0.052 %. */
function pct(x: number): string {
  const v = x * 100;
  if (v >= 99.5 && v < 100) return '>99%';
  if (v >= 10) return `${Math.round(v)}%`;
  return `${Number(v.toPrecision(2)).toLocaleString('en-US')}%`;
}

const signedPct = (x: number) => `${x >= 0 ? '+' : '−'}${pct(Math.abs(x))}`;

/** A chance in words: "1 in 310" when rare, otherwise a percentage. */
function chance(p: number): string {
  if (p <= 0) return 'never';
  if (p < 0.1) return `1 in ${Math.round(1 / p).toLocaleString('en-US')}`;
  return pct(p);
}

const chip =
  'h-auto min-h-11 rounded-full border border-border px-3 text-left text-sm/tight data-pressed:border-star/80 data-pressed:bg-star/20';

interface Names {
  structure: (slug: string) => string;
  reference: (slug: string) => string;
}

function termLabel(t: PatternTerm, names: Names): string {
  if (t.kind === 'reference') return names.reference(t.slug);
  const cond =
    t.condition === 'as_built' ? '' : ` (${CONDITION_LABELS[t.condition].toLowerCase()})`;
  return `${names.structure(t.structureSlug)} ${LENGTH_LABELS[t.length]}${cond}`;
}

function candidateLabel(c: Pick<Candidate, 'numerator' | 'denominator'>, names: Names): string {
  const { numerator: n, denominator: d } = c;
  if (n.kind === 'length' && d.kind === 'length') {
    const cond =
      n.condition === 'as_built' ? '' : ` (${CONDITION_LABELS[n.condition].toLowerCase()})`;
    return `${names.structure(n.structureSlug)}: ${LENGTH_LABELS[n.length]} ÷ ${LENGTH_LABELS[d.length]}${cond}`;
  }
  return `${termLabel(n, names)} ÷ ${termLabel(d, names)}`;
}

/** The narrowest space that still holds a pattern's own ratio. */
function patternSpace(p: NumericalPattern): CandidateSpace {
  const terms = [p.numerator, p.denominator];
  const lengthTerms = terms.filter((t) => t.kind === 'length');
  return {
    structures: [...new Set(lengthTerms.map((t) => t.structureSlug))],
    lengths: [...new Set(lengthTerms.map((t) => t.length))],
    conditions: [...new Set(lengthTerms.map((t) => t.condition))],
    references: terms.flatMap((t) => (t.kind === 'reference' ? [t.slug] : [])),
    pairings: [lengthTerms.length === 2 ? 'length-over-length' : 'reference-over-length'],
  };
}

/** One decade on a log scale. Ticks are ratios placed by their digits; bands are target windows. */
function DecadeStrip({
  candidates,
  targets,
  tolerance,
  matched,
  highlight,
  shiftDecimal,
}: {
  candidates: Candidate[];
  targets: number[];
  tolerance: number;
  matched: Set<string>;
  highlight: string | null;
  shiftDecimal: boolean;
}) {
  const frac = (v: number) => Math.log10(v) - Math.floor(Math.log10(v));
  const w = logWindow(tolerance);
  const bandCentres = [...new Set(targets.map((t) => Number(frac(t).toFixed(9))))];
  // At least 0.2 % of the strip, so the narrowest window stays visible.
  const bandWidth = Math.max(2 * w * 100, 0.2);
  const mark = highlight ? candidates.find((c) => c.key === highlight) : undefined;
  // Stretched to the strip's width; strokes keep their pixel width.
  const line = { vectorEffect: 'non-scaling-stroke' } as const;
  return (
    <div className="space-y-1">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="block h-16 w-full"
        role="img"
        aria-label={`${candidates.length} ratios placed by their leading digits; ${matched.size} fall inside a target window.`}
      >
        <rect x={0} y={12} width={100} height={76} className="fill-foreground/6" />
        {bandCentres.flatMap((c) =>
          // A window that crosses 1 or 10 wraps to the other end of the decade.
          [c, c - 1, c + 1].map((x) => (
            <rect
              key={`${c}:${x}`}
              x={x * 100 - bandWidth / 2}
              y={12}
              width={bandWidth}
              height={76}
              className={cn('fill-star', shiftDecimal ? 'opacity-50' : 'opacity-25')}
            />
          ))
        )}
        {candidates.map((c) => {
          const x = frac(c.value) * 100;
          const hit = matched.has(c.key);
          return (
            <line
              key={c.key}
              x1={x}
              x2={x}
              y1={hit ? 4 : 30}
              y2={hit ? 96 : 70}
              style={line}
              strokeWidth={hit ? 2.5 : 1}
              className={hit ? 'stroke-ember' : 'stroke-stone/70'}
            />
          );
        })}
        {mark ? (
          <line
            x1={frac(mark.value) * 100}
            x2={frac(mark.value) * 100}
            y1={0}
            y2={100}
            style={line}
            strokeWidth={1.5}
            strokeDasharray="3 2"
            className="stroke-foreground"
          />
        ) : null}
      </svg>
      <div aria-hidden className="relative h-4 text-xs text-muted-foreground tabular-nums">
        {/* No 9: it would crowd the 10 at phone width. */}
        {[1, 2, 3, 4, 5, 6, 7, 8, 10].map((d) => (
          <span
            key={d}
            className="absolute top-0"
            style={{
              left: `${Math.log10(d) * 100}%`,
              transform: `translateX(${d === 1 ? '0' : d === 10 ? '-100%' : '-50%'})`,
            }}
          >
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}

function ChipGroup<T extends string>({
  label,
  id,
  options,
  value,
  onChange,
}: {
  label: string;
  id: string;
  options: { value: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
}) {
  return (
    <div className="space-y-2">
      <p id={id} className="text-sm font-medium">
        {label}
      </p>
      <ToggleGroup
        multiple
        aria-labelledby={id}
        value={value}
        onValueChange={(v) => onChange(v as T[])}
        spacing={1}
        className="flex-wrap justify-start"
      >
        {options.map((o) => (
          <ToggleGroupItem key={o.value} value={o.value} className={chip}>
            {o.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

/**
 * The coincidence explorer: how many ratios the stored measurements and reference
 * constants can produce, how many land near a set of target numbers, and how close
 * a match must be to stand out from chance. The search lives in scene state
 * (`settings`, shareable in the URL); unset fields take their defaults.
 */
export function CoincidenceExplorer({
  pattern,
  patterns,
  claims,
  proponents,
  structures,
  measurements,
  references,
  settings,
  onSettings,
  onPattern,
  onBack,
}: {
  pattern: NumericalPattern | null;
  patterns: NumericalPattern[];
  claims: Claim[];
  proponents: Proponent[];
  structures: Structure[];
  measurements: Measurement[];
  references: ReferenceQuantity[];
  settings: ExplorerSettings | undefined;
  /** Merged into the search; an undefined field returns to its default. */
  onSettings: (patch: ExplorerSettings) => void;
  onPattern: (slug: string | null) => void;
  onBack: () => void;
}) {
  const lengths = useMemo(() => lengthsFrom(measurements), [measurements]);
  const everything = useMemo(() => fullSpace(lengths, references), [lengths, references]);
  const own = useMemo(
    () => (pattern ? testPattern(pattern, lengths, references) : null),
    [pattern, lengths, references]
  );

  const search = useMemo(
    () => resolveSettings(settings, { space: everything, pattern: own }),
    [settings, everything, own]
  );
  const { targets: families, shiftDecimal, tolerance } = search;
  const space: CandidateSpace = useMemo(
    () => ({
      structures: search.structures,
      lengths: search.lengths,
      conditions: search.conditions,
      references: search.references,
      pairings: search.pairings,
    }),
    [search]
  );
  const setSpace = (patch: Partial<CandidateSpace>) => onSettings(patch);

  const names: Names = useMemo(
    () => ({
      structure: (slug) => structures.find((s) => s.slug === slug)?.name ?? slug,
      reference: (slug) => references.find((r) => r.slug === slug)?.name ?? slug,
    }),
    [structures, references]
  );

  const candidates = useMemo(
    () => enumerateCandidates(lengths, references, space),
    [lengths, references, space]
  );
  const targets = useMemo(
    () => [
      ...(pattern && families.includes('claim') ? [pattern.target] : []),
      ...TARGET_FAMILIES.filter((f) => families.includes(f.slug)).flatMap((f) => f.values),
    ],
    [pattern, families]
  );
  const result = useMemo(
    () => analyze(candidates, targets, { tolerance, shiftDecimal }),
    [candidates, targets, tolerance, shiftDecimal]
  );
  const matched = useMemo(() => new Set(result.matches.map((m) => m.candidate.key)), [result]);
  const [showAll, setShowAll] = useState(false);

  const claim = pattern?.claimSlug ? claims.find((c) => c.slug === pattern.claimSlug) : undefined;
  const who = claim ? proponents.filter((p) => claim.proponentSlugs.includes(p.slug)) : [];
  const perRatio = result.candidates > 0 ? result.expectedChanceMatches / result.candidates : 0;
  const shown = showAll ? result.matches : result.matches.slice(0, 8);
  const lengthSet = new Set(lengths.map((l) => l.length));

  const familyOptions = [
    ...(pattern
      ? [
          {
            value: 'claim',
            label: `The claim’s number (${pattern.target.toLocaleString('en-US')})`,
          },
        ]
      : []),
    ...TARGET_FAMILIES.map((f) => ({ value: f.slug, label: f.label })),
  ];

  const controls = (
    <section aria-labelledby="coincidence-space" className="space-y-5">
      <div className="space-y-1.5">
        <PanelHeading id="coincidence-space">What the search may use</PanelHeading>
        <p className="text-sm/relaxed text-muted-foreground">
          Every combination below is one ratio. More freedom means more chances for a near miss to
          look meaningful.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            setSpace({
              structures: undefined,
              lengths: undefined,
              conditions: undefined,
              references: undefined,
              pairings: undefined,
            })
          }
          className="min-h-11 rounded-full border border-border px-4 text-sm hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Use everything
        </button>
        {pattern ? (
          <button
            type="button"
            onClick={() => setSpace(patternSpace(pattern))}
            className="min-h-11 rounded-full border border-border px-4 text-sm hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Only the claimed ratio
          </button>
        ) : null}
      </div>

      <ChipGroup
        id="cx-targets"
        label="Target numbers"
        options={familyOptions}
        value={families}
        onChange={(targets) => onSettings({ targets })}
      />
      <ul className="space-y-1 text-xs/relaxed text-muted-foreground">
        {TARGET_FAMILIES.filter((f) => families.includes(f.slug)).map((f) => (
          <li key={f.slug}>
            <span className="text-foreground/85">{f.label}:</span> {f.description}
          </li>
        ))}
      </ul>

      <label className="flex min-h-11 items-start justify-between gap-3 text-sm">
        <span>
          <span className="font-medium">Ignore the decimal point</span>
          <span className="block text-xs/relaxed text-muted-foreground">
            432, 4,320 and 43,200 count as the same number.
          </span>
        </span>
        <input
          type="checkbox"
          checked={shiftDecimal}
          onChange={(e) => onSettings({ shiftDecimal: e.target.checked })}
          className="mt-0.5 size-5 shrink-0 accent-(--star)"
        />
      </label>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span id="cx-tolerance" className="font-medium">
            Counts as a match within
          </span>
          <span className="tabular-nums">±{pct(tolerance)}</span>
        </div>
        <Slider
          aria-labelledby="cx-tolerance"
          min={0}
          max={1000}
          value={[Math.min(Math.max(toSlider(tolerance), 0), 1000)]}
          onValueChange={(v) =>
            onSettings({
              tolerance: Number(fromSlider(Array.isArray(v) ? v[0] : v).toPrecision(4)),
            })
          }
          className="py-3"
        />
      </div>

      <ChipGroup
        id="cx-structures"
        label="Structures"
        options={everything.structures.map((s) => ({ value: s, label: names.structure(s) }))}
        value={space.structures}
        onChange={(structures) => setSpace({ structures })}
      />
      <ChipGroup
        id="cx-lengths"
        label="Lengths"
        options={LENGTH_QUANTITIES.filter((q) => lengthSet.has(q)).map((q) => ({
          value: q,
          label: LENGTH_LABELS[q][0].toUpperCase() + LENGTH_LABELS[q].slice(1),
        }))}
        value={space.lengths}
        onChange={(l) => setSpace({ lengths: l })}
      />
      <ChipGroup
        id="cx-conditions"
        label="Measured as"
        options={everything.conditions.map((c) => ({ value: c, label: CONDITION_LABELS[c] }))}
        value={space.conditions}
        onChange={(c) => setSpace({ conditions: c as MeasurementCondition[] })}
      />
      <ChipGroup
        id="cx-references"
        label="Earth constants"
        options={references.map((r) => ({
          value: r.slug,
          label: r.name.replace(/^Earth’s /, '').replace(/^./, (c) => c.toUpperCase()),
        }))}
        value={space.references}
        onChange={(r) => setSpace({ references: r })}
      />
      <ChipGroup
        id="cx-pairings"
        label="Ratios of"
        options={everything.pairings.map((p) => ({ value: p, label: PAIRING_LABELS[p] }))}
        value={space.pairings}
        onChange={(p) => setSpace({ pairings: p })}
      />
    </section>
  );

  const results = (
    <section aria-labelledby="coincidence-result" aria-live="polite" className="space-y-5">
      <PanelHeading id="coincidence-result">What the search finds</PanelHeading>
      <p className="font-heading text-2xl/snug text-foreground">
        {result.candidates.toLocaleString('en-US')} {result.candidates === 1 ? 'ratio' : 'ratios'},{' '}
        {result.matches.length.toLocaleString('en-US')} within ±{pct(tolerance)} of a target.
      </p>
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Matches luck alone would give</dt>
          <dd className="text-lg tabular-nums">
            about {formatRatio(result.expectedChanceMatches, 2)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Chance of at least one by luck</dt>
          <dd className="text-lg tabular-nums">{chance(result.chanceOfAnyMatch)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">To stand out at 1 in 20, a match must be within</dt>
          <dd className="text-lg tabular-nums">
            {result.candidates > 0 && targets.length > 0
              ? `±${pct(result.standOutTolerance)}`
              : '—'}
          </dd>
        </div>
      </dl>

      <figure className="space-y-2">
        <DecadeStrip
          candidates={candidates}
          targets={targets}
          tolerance={tolerance}
          matched={matched}
          highlight={own?.key ?? null}
          shiftDecimal={shiftDecimal}
        />
        <figcaption className="text-xs/relaxed text-muted-foreground">
          Each tick is one ratio, placed by its leading digits on a log scale from 1 to 10. Shaded
          bands are the target windows; a ratio lands in one by luck {chance(perRatio)} of the time.
          {own ? ' The dashed line is the claimed ratio.' : ''}
          {!shiftDecimal
            ? ' With the decimal point fixed, a band only counts for ratios of its own size.'
            : ''}
        </figcaption>
      </figure>

      {result.matches.length > 0 ? (
        <div className="space-y-2">
          <h4 className="font-medium">Matches, closest first</h4>
          <ul className="divide-y divide-border text-sm">
            {shown.map((m) => (
              <li
                key={m.candidate.key}
                className={cn(
                  'grid grid-cols-[1fr_auto] gap-x-3 py-2',
                  m.candidate.key === own?.key && 'font-medium'
                )}
              >
                <span>
                  {candidateLabel(m.candidate, names)}
                  {m.candidate.key === own?.key ? (
                    <span className="text-muted-foreground"> (the claim)</span>
                  ) : null}
                </span>
                <span className="text-right tabular-nums">
                  {formatRatio(m.candidate.value)}
                  <span className="block text-xs text-muted-foreground">
                    {formatRatio(m.scaled, 6)} {signedPct(m.offset)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {result.matches.length > 8 ? (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="min-h-11 text-sm underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
            >
              {showAll ? 'Show the closest 8' : `Show all ${result.matches.length}`}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <h4 className="font-medium">Assumptions</h4>
        <ul className="list-disc space-y-1 pl-5 text-sm/relaxed text-muted-foreground">
          <li>
            Chance model: the leading digits of a ratio between unrelated quantities are spread
            evenly on a log scale (Benford’s law).
          </li>
          <li>
            Ratios that share a measurement aren’t independent, so the chances are approximate.
          </li>
          <li>Perimeter, half base, diagonal and slant height assume a square base.</li>
          <li>Fixed ratios (perimeter ÷ base side is always 4) are left out.</li>
          <li>“Stand out” means luck alone would do as well less than 1 time in 20.</li>
        </ul>
      </div>
    </section>
  );

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <button
          type="button"
          onClick={onBack}
          className="-ml-3 inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Back to measurements
        </button>
        <h2 className="font-heading text-3xl/tight font-semibold">Coincidence explorer</h2>
        <p className="max-w-prose text-sm/relaxed text-muted-foreground">
          Search enough ratios and some will land near a meaningful-looking number. This counts the
          ratios the measurements and Earth constants can make, and how close a match must be before
          luck stops explaining it.
        </p>
      </div>

      {patterns.length > 0 ? (
        <section aria-labelledby="coincidence-pattern" className="space-y-4">
          <PanelHeading id="coincidence-pattern">Claimed pattern</PanelHeading>
          <ToggleGroup
            aria-labelledby="coincidence-pattern"
            value={[pattern?.slug ?? 'none']}
            onValueChange={(v) => v[0] && onPattern(v[0] === 'none' ? null : v[0])}
            spacing={1}
            className="flex-wrap justify-start"
          >
            <ToggleGroupItem value="none" className={chip}>
              None: search freely
            </ToggleGroupItem>
            {patterns.map((p) => (
              <ToggleGroupItem key={p.slug} value={p.slug} className={chip}>
                {p.title}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {pattern ? (
            <article className="space-y-4 rounded-xl border border-border bg-background/40 p-4">
              {claim ? (
                <div className="space-y-2">
                  <p className="text-base/snug">{claim.statement}</p>
                  <ClaimLabels reception={claim.reception} basis={claim.basis} />
                  {who.length > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Argued by {who.map((p) => p.name).join(', ')}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {own ? (
                <>
                  <p className="text-sm">
                    {candidateLabel(pattern, names)} ={' '}
                    <span className="tabular-nums">{formatRatio(own.value)}</span>, which is{' '}
                    <span className="tabular-nums">{signedPct(own.offset)}</span> from{' '}
                    {pattern.target.toLocaleString('en-US')}.
                  </p>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-lg bg-foreground/5 p-3">
                      <dt className="text-muted-foreground">
                        Chance if this one ratio was named in advance
                      </dt>
                      <dd className="font-heading text-2xl tabular-nums">
                        {chance(own.chanceAlone)}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-foreground/5 p-3">
                      <dt className="text-muted-foreground">
                        Chance the search below finds one this close
                      </dt>
                      <dd className="font-heading text-2xl tabular-nums">
                        {chance(
                          analyze(candidates, targets, {
                            tolerance: own.tolerance,
                            shiftDecimal,
                          }).chanceOfAnyMatch
                        )}
                      </dd>
                    </div>
                  </dl>
                  <p className="text-xs/relaxed text-muted-foreground">
                    The gap between the two is the look-elsewhere effect: the more ratios and target
                    numbers a search allows, the more likely a close match is somewhere. Neither
                    number says whether the builders intended the ratio.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  The measurements this pattern uses aren’t in the data yet.
                </p>
              )}
            </article>
          ) : null}
        </section>
      ) : null}

      {/* Side by side once the panel is wide enough; otherwise results first. */}
      <div className="@container">
        <div className="grid gap-10 @3xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          {results}
          <div className="@3xl:order-first">{controls}</div>
        </div>
      </div>

      {measurements.some((m) => m.unverified) ? (
        <UnverifiedNote>
          The measurements are placeholders, not yet checked against a source, so these counts show
          the method, not a finding.
        </UnverifiedNote>
      ) : null}
    </div>
  );
}
