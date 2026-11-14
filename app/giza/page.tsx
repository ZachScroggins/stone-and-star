import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BareChat } from '@/components/chat/bare-chat';
import { GizaExplorerLoader } from '@/components/scene/giza-explorer-loader';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { isLocalClaudeEnabled } from '@/lib/ai/models';
import { getSiteData } from '@/lib/data';
import { getPanelData } from '@/lib/data/panel';

export const metadata: Metadata = { title: 'Giza' };

// The full-page scene comes first; its info panel holds the measurements, timeline and
// views. The bare chat stays below the scene until the chat bar gets the guide (M5).
export default async function GizaPage() {
  const data = getSiteData();
  const site = await data.getSite('giza');
  if (!site) notFound();

  const anchors = await data.listAnchors(site.slug);
  const panel = await getPanelData(data, site.slug);

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
          measurements={panel.measurements}
          panel={panel}
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

        <div className="mt-12 max-w-2xl">
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
            The pyramids are schematic models generated from the placeholder measurements in the
            Facts tab, not surveys. Stars: ESA, The Hipparcos and Tycho Catalogues (1997). Terrain:
            Copernicus GLO-30 DEM, © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH
            2014-2018, provided under COPERNICUS by the European Union and ESA; all rights reserved.
            Constellation figures and star names: Stellarium&rsquo;s team, Stellarium 26.3
            &ldquo;modern&rdquo; sky culture, CC BY-SA 4.0.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
