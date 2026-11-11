import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BareChat } from '@/components/chat/bare-chat';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { isLocalClaudeEnabled } from '@/lib/ai/models';
import { MEASUREMENT_PROPERTIES, type Measurement } from '@/lib/contracts/site';
import { getSiteData } from '@/lib/data';

export const metadata: Metadata = { title: 'Giza' };

const CONDITION_LABELS: Record<Measurement['condition'], string> = {
  as_built: 'As built',
  surviving: 'Surviving',
  reconstructed: 'Reconstructed',
  unspecified: 'Unspecified',
};

function formatValue(m: Measurement) {
  const { unit } = MEASUREMENT_PROPERTIES[m.property];
  return unit === 'deg' ? `${m.value}°` : `${m.value} m`;
}

// Milestone 1 placeholder. Milestone 2 replaces this with the full-page 3D scene.
export default async function GizaPage() {
  const data = getSiteData();
  const site = await data.getSite('giza');
  if (!site) notFound();

  const structures = await data.listStructures(site.slug);
  const rows = await Promise.all(
    structures.map(async (s) => ({
      structure: s,
      measurements: await data.getMeasurements(s.slug),
    }))
  );

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader siteName={site.name} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pt-8 pb-16 sm:px-8">
        <div className="max-w-2xl">
          <h1 className="font-display text-4xl font-semibold tracking-wide sm:text-5xl">
            {site.name}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {site.region} · {site.coordinates.lat.toFixed(4)}° N, {site.coordinates.lon.toFixed(4)}°
            E
          </p>
          <p className="mt-5 text-lg leading-relaxed">{site.summary}</p>
          {site.unverified ? (
            <p className="mt-5 border-l-2 border-ember pl-4 text-sm leading-relaxed">
              Every figure on this page is a placeholder used to build the site. None has been
              checked against a source yet, so don’t cite them.
            </p>
          ) : null}
        </div>

        <div className="mt-12 grid gap-12 lg:grid-cols-[1.2fr_1fr]">
          <section aria-labelledby="measurements-heading">
            <h2
              id="measurements-heading"
              className="font-display text-2xl font-semibold tracking-wide"
            >
              Measurements
            </h2>
            <div className="mt-4 space-y-8">
              {rows.map(({ structure, measurements }) => (
                <div key={structure.slug}>
                  <h3 className="font-heading text-2xl font-semibold">{structure.name}</h3>
                  {measurements.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">No measurements yet.</p>
                  ) : (
                    <Table className="mt-2 table-fixed">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[34%]">Property</TableHead>
                          <TableHead className="w-[22%]">Condition</TableHead>
                          <TableHead className="w-[18%] text-right">Value</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {measurements.map((m) => (
                          <TableRow key={m.slug}>
                            <TableCell>{MEASUREMENT_PROPERTIES[m.property].label}</TableCell>
                            <TableCell>{CONDITION_LABELS[m.condition]}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatValue(m)}
                            </TableCell>
                            <TableCell>
                              {m.unverified ? <Badge variant="outline">Unverified</Badge> : null}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              ))}
            </div>
          </section>

          <BareChat localModel={isLocalClaudeEnabled()} />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
