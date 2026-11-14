import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BareChat } from '@/components/chat/bare-chat';
import { GizaExplorerLoader } from '@/components/scene/giza-explorer-loader';
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

// The full-page scene comes first. The measurement table and the bare chat stay below
// it until the info panel (M3) and the chat bar (M5) replace them.
export default async function GizaPage() {
  const data = getSiteData();
  const site = await data.getSite('giza');
  if (!site) notFound();

  const structures = await data.listStructures(site.slug);
  const anchors = await data.listAnchors(site.slug);
  const rows = await Promise.all(
    structures.map(async (s) => ({
      structure: s,
      measurements: await data.getMeasurements(s.slug),
    }))
  );

  return (
    <div className="flex min-h-svh flex-col">
      <div className="relative">
        <div className="absolute inset-x-0 top-0 z-20 bg-background/75 backdrop-blur-md">
          <SiteHeader siteName={site.name} />
        </div>
        <GizaExplorerLoader
          siteSlug={site.slug}
          lat={site.coordinates.lat}
          lon={site.coordinates.lon}
          anchors={anchors}
          measurements={rows.flatMap((r) => r.measurements)}
        />
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pt-12 pb-16 sm:px-8">
        <div className="max-w-2xl">
          <h1 className="font-display text-4xl font-semibold tracking-wide sm:text-5xl">
            {site.name}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {site.region} · {site.coordinates.lat.toFixed(4)}° N, {site.coordinates.lon.toFixed(4)}°
            E
          </p>
          <p className="mt-5 text-lg/relaxed">{site.summary}</p>
          {site.unverified ? (
            <p className="mt-5 border-l-2 border-ember pl-4 text-sm/relaxed">
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

        <section
          aria-labelledby="credits-heading"
          className="mt-16 max-w-3xl text-sm/relaxed text-muted-foreground"
        >
          <h2 id="credits-heading" className="font-heading text-xl text-foreground">
            About the scene
          </h2>
          <p className="mt-2">
            The pyramids are schematic models generated from the placeholder measurements above, not
            surveys. Stars: ESA, The Hipparcos and Tycho Catalogues (1997). Terrain: Copernicus
            GLO-30 DEM, © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018, provided
            under COPERNICUS by the European Union and ESA; all rights reserved. Constellation
            figures and star names: Stellarium&rsquo;s team, Stellarium 26.3 &ldquo;modern&rdquo;
            sky culture, CC BY-SA 4.0.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
