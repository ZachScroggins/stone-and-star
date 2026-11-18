'use client';

import { Crosshair, Sigma } from 'lucide-react';
import { useState } from 'react';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { ReferenceQuantity } from '@/lib/contracts/alignment';
import type { Claim, Proponent } from '@/lib/contracts/claims';
import type { NumericalPattern } from '@/lib/contracts/coincidence';
import { MEASUREMENT_PROPERTIES, type Measurement, type Structure } from '@/lib/contracts/site';
import { CONDITION_LABELS, formatMeasurementValue } from '@/lib/facts/format';
import { formatRatio, ratioOf } from '@/lib/facts/ratio';

import { CoincidenceExplorer } from './coincidence-explorer';
import { ClaimLabels, PanelHeading, UnverifiedNote } from './labels';

const lengthLike = (m: Measurement) => MEASUREMENT_PROPERTIES[m.property].unit === 'm';

const pillButton =
  'inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-4 text-sm hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';

/**
 * Measurements per structure, and their ratios against one Earth constant at a time.
 * Every ratio names the measurement and the constant it used. With the coincidence
 * explorer open (scene state), the tab shows the explorer instead.
 */
export function FactsTab({
  structures,
  measurements,
  references,
  patterns,
  claims,
  proponents,
  explorer,
  onFocusStructure,
  onOpenExplorer,
  onCloseExplorer,
}: {
  structures: Structure[];
  measurements: Measurement[];
  references: ReferenceQuantity[];
  patterns: NumericalPattern[];
  claims: Claim[];
  proponents: Proponent[];
  explorer: { pattern: string | null } | null;
  onFocusStructure: (structureSlug: string) => void;
  onOpenExplorer: (pattern?: string) => void;
  onCloseExplorer: () => void;
}) {
  if (explorer) {
    const pattern = patterns.find((p) => p.slug === explorer.pattern) ?? null;
    return (
      <CoincidenceExplorer
        // A new pattern starts a fresh search.
        key={pattern?.slug ?? 'none'}
        pattern={pattern}
        patterns={patterns}
        claims={claims}
        proponents={proponents}
        structures={structures}
        measurements={measurements}
        references={references}
        onPattern={(slug) => onOpenExplorer(slug ?? undefined)}
        onBack={onCloseExplorer}
      />
    );
  }
  return (
    <Facts
      structures={structures}
      measurements={measurements}
      references={references}
      patterns={patterns}
      claims={claims}
      proponents={proponents}
      onFocusStructure={onFocusStructure}
      onOpenExplorer={onOpenExplorer}
    />
  );
}

function Facts({
  structures,
  measurements,
  references,
  patterns,
  claims,
  proponents,
  onFocusStructure,
  onOpenExplorer,
}: {
  structures: Structure[];
  measurements: Measurement[];
  references: ReferenceQuantity[];
  patterns: NumericalPattern[];
  claims: Claim[];
  proponents: Proponent[];
  onFocusStructure: (structureSlug: string) => void;
  onOpenExplorer: (pattern?: string) => void;
}) {
  const [refSlug, setRefSlug] = useState(references[0]?.slug ?? '');
  const reference = references.find((r) => r.slug === refSlug) ?? references[0];
  const groups = structures
    .map((s) => ({ structure: s, rows: measurements.filter((m) => m.structureSlug === s.slug) }))
    .filter((g) => g.rows.length > 0);

  return (
    <div className="space-y-8">
      <section aria-labelledby="facts-measurements" className="space-y-5">
        <PanelHeading id="facts-measurements">Measurements</PanelHeading>
        {groups.map(({ structure, rows }) => (
          <div key={structure.slug} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-medium">{structure.name}</h4>
              <button
                type="button"
                onClick={() => onFocusStructure(structure.slug)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Crosshair aria-hidden className="size-4" />
                Show in scene
              </button>
            </div>
            <table className="w-full table-fixed text-sm">
              <thead className="sr-only">
                <tr>
                  <th>Property</th>
                  <th>Condition</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.slug} className="border-t border-border">
                    <td className="w-[44%] py-2">{MEASUREMENT_PROPERTIES[m.property].label}</td>
                    <td className="py-2 text-muted-foreground">{CONDITION_LABELS[m.condition]}</td>
                    <td className="py-2 text-right tabular-nums">
                      {formatMeasurementValue(m)}
                      {m.uncertainty !== undefined ? ` ± ${m.uncertainty}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>

      {reference ? (
        <section aria-labelledby="facts-ratios" className="space-y-4">
          <PanelHeading id="facts-ratios">Ratios against an Earth constant</PanelHeading>
          <ToggleGroup
            value={[reference.slug]}
            onValueChange={(v) => v[0] && setRefSlug(v[0])}
            aria-label="Earth constant"
            spacing={1}
            className="flex-wrap justify-start"
          >
            {references.map((r) => (
              <ToggleGroupItem
                key={r.slug}
                value={r.slug}
                className="h-auto min-h-11 rounded-full border border-border px-3 text-left text-sm/tight data-pressed:border-primary/70 data-pressed:bg-primary/15"
              >
                {r.name.replace(/^Earth’s /, '')}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <p className="text-sm text-muted-foreground">
            {reference.name}: {(reference.value / 1000).toLocaleString('en-US')} km.{' '}
            {reference.definition}
          </p>
          <ul className="divide-y divide-border text-sm">
            {groups.flatMap(({ structure, rows }) =>
              rows.filter(lengthLike).map((m) => {
                const r = ratioOf(reference.value, m.value);
                return (
                  <li key={m.slug} className="flex items-baseline justify-between gap-3 py-2">
                    <span>
                      {structure.name}, {MEASUREMENT_PROPERTIES[m.property].label.toLowerCase()} (
                      {CONDITION_LABELS[m.condition].toLowerCase()})
                    </span>
                    <span className="shrink-0 tabular-nums">× {formatRatio(r.value)}</span>
                  </li>
                );
              })
            )}
          </ul>
          <div className="space-y-1.5 text-sm/relaxed text-muted-foreground">
            <p>
              Each line divides the constant by the measurement. Assumptions: the measurement listed
              (as-built and surviving values differ), the constant’s definition above, and the
              placeholder values on this page.
            </p>
            <p>
              Whether a ratio stands out from chance depends on how many ratios were searched. The
              coincidence explorer counts them.
            </p>
          </div>
          <button type="button" onClick={() => onOpenExplorer()} className={pillButton}>
            <Sigma aria-hidden className="size-4" />
            Open the coincidence explorer
          </button>
        </section>
      ) : null}

      {patterns.length > 0 ? (
        <section aria-labelledby="facts-patterns" className="space-y-4">
          <PanelHeading id="facts-patterns">Numerical patterns</PanelHeading>
          {patterns.map((p) => {
            const claim = claims.find((c) => c.slug === p.claimSlug);
            const who = claim
              ? proponents.filter((pr) => claim.proponentSlugs.includes(pr.slug))
              : [];
            return (
              <article
                key={p.slug}
                className="space-y-3 rounded-xl border border-border bg-background/40 p-4"
              >
                <p className="text-base/snug">{claim?.statement ?? p.title}</p>
                {claim ? <ClaimLabels reception={claim.reception} basis={claim.basis} /> : null}
                {who.length > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Argued by {who.map((pr) => pr.name).join(', ')}
                  </p>
                ) : null}
                <button type="button" onClick={() => onOpenExplorer(p.slug)} className={pillButton}>
                  <Sigma aria-hidden className="size-4" />
                  Test against chance
                </button>
              </article>
            );
          })}
        </section>
      ) : null}

      {measurements.some((m) => m.unverified) ? <UnverifiedNote /> : null}
    </div>
  );
}
