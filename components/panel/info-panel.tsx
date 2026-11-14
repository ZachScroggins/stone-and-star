'use client';

import { BookOpenText, Maximize2, Minimize2, X } from 'lucide-react';
import type { ReactNode } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { PanelData } from '@/lib/data/panel';
import { availableTabs } from '@/lib/data/panel';
import type { SceneState } from '@/lib/scene/state';
import { cn } from '@/lib/utils';

type Tab = SceneState['panel']['tab'];
type Size = SceneState['panel']['size'];

const TAB_LABELS: Record<Tab, string> = {
  facts: 'Facts',
  sky: 'Sky',
  timeline: 'Timeline',
  views: 'Views',
};

const iconButton =
  'flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';

/**
 * The info panel floats over the scene in three states: an icon (full immersion),
 * phone width (read while you move the model) or expanded (focused reading). On
 * phones, open means a sheet over the lower scene. Tabs appear only with data.
 */
export function InfoPanel({
  data,
  tab,
  size,
  onPanel,
  renderTab,
}: {
  data: PanelData;
  tab: Tab;
  size: Size;
  onPanel: (tab: Tab, size: Size) => void;
  renderTab: (tab: Tab, wide: boolean) => ReactNode;
}) {
  const available = availableTabs(data);
  const tabs = (Object.keys(TAB_LABELS) as Tab[]).filter((t) => available[t]);
  if (tabs.length === 0) return null;
  const active = tabs.includes(tab) ? tab : tabs[0];

  if (size === 'icon') {
    return (
      <button
        type="button"
        onClick={() => onPanel(active, 'phone')}
        aria-label="Open the info panel"
        title="Facts, sky, timeline and views"
        className="pointer-events-auto flex size-11 items-center justify-center rounded-full border border-white/15 bg-background/75 text-foreground shadow-lg backdrop-blur-md transition-colors hover:bg-background/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <BookOpenText aria-hidden className="size-5" />
      </button>
    );
  }

  const wide = size === 'full';
  return (
    <aside
      aria-label="Info panel"
      className={cn(
        'pointer-events-auto flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-background/88 text-foreground shadow-[0_20px_60px_-20px_rgb(0_0_0/0.7)] backdrop-blur-md',
        'max-sm:rounded-b-none'
      )}
    >
      <Tabs
        value={active}
        onValueChange={(v) => onPanel(v as Tab, size)}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
          <TabsList
            variant="line"
            className="h-11 min-w-0 flex-1 justify-start overflow-x-auto scrollbar-none"
          >
            {tabs.map((t) => (
              <TabsTrigger key={t} value={t} className="h-11 flex-none px-3 text-sm">
                {TAB_LABELS[t]}
              </TabsTrigger>
            ))}
          </TabsList>
          <button
            type="button"
            onClick={() => onPanel(active, wide ? 'phone' : 'full')}
            aria-label={wide ? 'Narrow the panel' : 'Expand the panel'}
            title={wide ? 'Narrow the panel' : 'Expand the panel'}
            className={cn(iconButton, 'max-sm:hidden')}
          >
            {wide ? (
              <Minimize2 aria-hidden className="size-4" />
            ) : (
              <Maximize2 aria-hidden className="size-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onPanel(active, 'icon')}
            aria-label="Close the info panel"
            title="Close the info panel"
            className={iconButton}
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        {tabs.map((t) => (
          <TabsContent
            key={t}
            value={t}
            className={cn(
              'min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-28',
              wide && 'sm:px-8'
            )}
          >
            <div className={cn(wide && 'mx-auto max-w-5xl')}>{renderTab(t, wide)}</div>
          </TabsContent>
        ))}
      </Tabs>
    </aside>
  );
}
