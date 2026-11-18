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

function shownTabs(data: PanelData) {
  const available = availableTabs(data);
  return (Object.keys(TAB_LABELS) as Tab[]).filter((t) => available[t]);
}

/** Opens the info panel from its closed (icon) state. Sits at the end of the top row. */
export function InfoPanelButton({
  data,
  tab,
  onPanel,
  className,
}: {
  data: PanelData;
  tab: Tab;
  onPanel: (tab: Tab, size: Size) => void;
  className?: string;
}) {
  const tabs = shownTabs(data);
  if (tabs.length === 0) return null;
  const active = tabs.includes(tab) ? tab : tabs[0];
  return (
    <button
      type="button"
      onClick={() => onPanel(active, 'phone')}
      aria-label="Open the info panel"
      title="Facts, sky, timeline and views"
      className={cn(
        'pointer-events-auto flex size-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-background/75 text-foreground shadow-lg backdrop-blur-md transition-colors hover:bg-background/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        className
      )}
    >
      <BookOpenText aria-hidden className="size-5" />
    </button>
  );
}

/**
 * The info panel floats over the scene in three states: closed (full immersion; the
 * open button is `InfoPanelButton`), phone width (read while you move the model) or
 * expanded (focused reading). On phones, open means a sheet over the scene and its
 * top row, under the chat bar. Tabs appear only with data.
 * Expanded, the sky's date and time get their own column beside the tabs; otherwise
 * they float on their own toggle (see the explorer), and `headerActions` can put
 * that toggle in the panel's header where the sheet covers it (phones).
 */
export function InfoPanel({
  data,
  tab,
  size,
  onPanel,
  renderTab,
  renderTime,
  headerActions,
}: {
  data: PanelData;
  tab: Tab;
  size: Size;
  onPanel: (tab: Tab, size: Size) => void;
  renderTab: (tab: Tab, wide: boolean) => ReactNode;
  /** The date and time column, shown only when expanded. */
  renderTime?: () => ReactNode;
  headerActions?: ReactNode;
}) {
  const tabs = shownTabs(data);
  if (tabs.length === 0 || size === 'icon') return null;
  const active = tabs.includes(tab) ? tab : tabs[0];

  const wide = size === 'full';
  return (
    <aside
      aria-label="Info panel"
      className={cn(
        'pointer-events-auto flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-background/88 text-foreground shadow-[0_20px_60px_-20px_rgb(0_0_0/0.7)] backdrop-blur-md',
        // Phones: the sheet runs under the chat bar, so its content stops above it.
        'max-sm:rounded-b-none max-sm:pb-19'
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
          {headerActions}
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
        <div className="flex min-h-0 flex-1">
          {wide && renderTime ? (
            <div className="w-96 shrink-0 overflow-y-auto overscroll-contain border-r border-border p-5">
              {renderTime()}
            </div>
          ) : null}
          {tabs.map((t) => (
            <TabsContent
              key={t}
              value={t}
              className={cn(
                'min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5',
                // Expanded, the chat bar floats over the bottom of the reading column.
                wide ? 'pb-28 sm:px-8' : 'pb-8'
              )}
            >
              <div className={cn(wide && 'mx-auto max-w-5xl')}>{renderTab(t, wide)}</div>
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </aside>
  );
}
