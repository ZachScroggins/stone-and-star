'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ChatBar } from '@/components/panel/chat-bar';
import { FactsTab } from '@/components/panel/facts-tab';
import { InfoPanel } from '@/components/panel/info-panel';
import { SkyTab, type ShowInSky } from '@/components/panel/sky-tab';
import { TimelineTab } from '@/components/panel/timeline-tab';
import { ViewsTab } from '@/components/panel/views-tab';
import { SKY_FIGURES_URL, SkyFiguresV1 } from '@/lib/astro/constellations';
import type { Anchor, Measurement } from '@/lib/contracts/site';
import type { PanelData } from '@/lib/data/panel';
import { fromLocal, toLocal } from '@/lib/geo/local';
import { modelManifestUrl, ModelManifestV1 } from '@/lib/models/manifest';
import { useSceneStore } from '@/lib/scene/store';
import { decodeHeights, GIZA_TERRAIN_URL, heightAt, TerrainV1 } from '@/lib/scene/terrain';
import { sceneFromSearchParams, sceneToSearchParams } from '@/lib/scene/url';
import { sightTo, type WalkPose, type WalkWorld } from '@/lib/scene/walk';
import { cn } from '@/lib/utils';

import { LayerBar } from './layer-bar';
import type { AnchorMarker, DimensionSpec } from './overlays';
import { SkyConsole } from './sky-console';
import type { PlacedModel } from './structures';
import { useSky } from './use-sky';
import { useWalkInfo, WalkInfo, WalkPad, type SightReadout } from './walk-pad';

const SceneCanvas = dynamic(() => import('./scene-canvas'), { ssr: false });

const DEG = Math.PI / 180;

export interface GizaExplorerProps {
  siteSlug: string;
  lat: number;
  lon: number;
  anchors: Anchor[];
  measurements: Measurement[];
  /** Everything the info panel shows. */
  panel: PanelData;
}

const isPhone = () => window.matchMedia('(max-width: 639px)').matches;

function useJson<T>(url: string, parse: (v: unknown) => T) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`${url} returned ${r.status}`);
        return r.json();
      })
      .then((j) => !cancelled && setData(parse(j)))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
    // `parse` is a stable schema method.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);
  return { data, error };
}

export default function GizaExplorer(props: GizaExplorerProps) {
  const state = useSceneStore((s) => s.state);
  const dispatch = useSceneStore((s) => s.dispatch);
  const replace = useSceneStore((s) => s.replace);

  // Scene state <-> URL. Read once on mount, then mirror changes (debounced).
  useEffect(() => {
    const current = useSceneStore.getState().state;
    replace(sceneFromSearchParams(new URLSearchParams(window.location.search), current));
  }, [replace]);
  useEffect(() => {
    const t = setTimeout(() => {
      const query = sceneToSearchParams(state).toString();
      window.history.replaceState(window.history.state, '', `?${query}`);
    }, 300);
    return () => clearTimeout(t);
  }, [state]);

  const terrain = useJson(GIZA_TERRAIN_URL, (j) => TerrainV1.parse(j));
  const manifest = useJson(modelManifestUrl(props.siteSlug), (j) => ModelManifestV1.parse(j));
  const skyFigures = useJson(SKY_FIGURES_URL, (j) => SkyFiguresV1.parse(j));
  const heights = useMemo(
    () => (terrain.data ? decodeHeights(terrain.data) : null),
    [terrain.data]
  );

  const sky = useSky({
    year: state.epoch,
    dayOfYear: state.sky.dayOfYear,
    solarHour: state.sky.solarHour,
    latDeg: props.lat,
    lonDeg: props.lon,
  });

  const placed = useMemo(() => {
    if (!terrain.data || !heights) return null;
    const t = terrain.data;
    const anchors = new Map(
      props.anchors.map((a) => {
        const p = toLocal(t.origin, a.lat, a.lon);
        return [a.slug, [p.x, heightAt(t, heights, p.x, p.z), p.z] as [number, number, number]];
      })
    );
    return { anchors, terrain: t };
  }, [terrain.data, heights, props.anchors]);

  const models: PlacedModel[] = useMemo(() => {
    if (!manifest.data || !placed) return [];
    const byStructure = new Map<string, ModelManifestV1['models']>();
    for (const m of manifest.data.models) {
      byStructure.set(m.structureSlug, [...(byStructure.get(m.structureSlug) ?? []), m]);
    }
    const out: PlacedModel[] = [];
    for (const variants of byStructure.values()) {
      const chosen =
        variants.find((v) => v.condition === state.condition) ??
        variants.find((v) => v.condition === 'as_built') ??
        variants[0];
      const pos = placed.anchors.get(chosen.anchorSlug);
      if (pos) out.push({ model: chosen, position: [pos[0], pos[1] - 0.3, pos[2]] });
    }
    return out;
  }, [manifest.data, placed, state.condition]);

  const markers: AnchorMarker[] = useMemo(() => {
    if (!placed) return [];
    return props.anchors.flatMap((a) => {
      const position = placed.anchors.get(a.slug);
      if (!position) return [];
      const model = models.find((m) => m.model.anchorSlug === a.slug);
      const top = model ? Number(model.model.params.topHeight ?? model.model.params.height) : 25;
      return [
        { slug: a.slug, name: a.name, position, labelHeight: top + 18, unverified: a.unverified },
      ];
    });
  }, [placed, props.anchors, models]);

  const dimensions: DimensionSpec[] = useMemo(
    () =>
      models.map((m) => {
        const used = props.measurements.filter((x) => m.model.measurementSlugs.includes(x.slug));
        return {
          slug: `${m.model.structureSlug}-${m.model.condition}`,
          position: m.position,
          baseSide: Number(m.model.params.baseSide),
          height: Number(m.model.params.topHeight ?? m.model.params.height),
          unverified: used.some((x) => x.unverified),
        };
      }),
    [models, props.measurements]
  );

  const focusTarget = useMemo<[number, number, number]>(() => {
    const p = state.focus ? placed?.anchors.get(state.focus) : undefined;
    return p ? [p[0], p[1] + 40, p[2]] : [-250, 40, 350];
  }, [state.focus, placed]);

  // Sky view starts 450 m south-east of the Great Pyramid, looking back across the
  // plateau (north-west, 25° up), so the pyramids sit on the horizon under the sky.
  const defaultStandpoint = useMemo<WalkPose>(() => {
    const gp = placed?.anchors.get('great-pyramid-center');
    if (!gp) return { x: 0, z: 0, heading: 315 * DEG, pitch: 25 * DEG };
    return { x: gp[0] + 320, z: gp[2] + 320, heading: 315 * DEG, pitch: 25 * DEG };
  }, [placed]);

  const standpoint = useMemo<WalkPose>(() => {
    const s = state.standpoint;
    if (!s || !placed) return defaultStandpoint;
    const p = toLocal(placed.terrain.origin, s.lat, s.lon);
    return { x: p.x, z: p.z, heading: s.heading * DEG, pitch: s.pitch * DEG };
  }, [state.standpoint, placed, defaultStandpoint]);

  const onStandpoint = useCallback(
    (pose: WalkPose) => {
      if (!placed) return;
      const { lat, lon } = fromLocal(placed.terrain.origin, pose.x, pose.z);
      dispatch({
        type: 'setStandpoint',
        standpoint: { lat, lon, heading: pose.heading / DEG, pitch: pose.pitch / DEG },
      });
    },
    [placed, dispatch]
  );

  // Pyramids are solid, and the viewer stays on the terrain tile.
  const walkWorld = useMemo<WalkWorld>(
    () => ({
      footprints: models.map((m) => ({
        x: m.position[0],
        z: m.position[2],
        halfSide: Number(m.model.params.baseSide) / 2,
      })),
      halfExtent: placed ? ((placed.terrain.size - 1) * placed.terrain.spacingM) / 2 - 60 : 1000,
    }),
    [models, placed]
  );

  const groundAt = useCallback(
    (x: number, z: number) => (placed && heights ? heightAt(placed.terrain, heights, x, z) : 0),
    [placed, heights]
  );

  // Where the Great Pyramid's apex stands from the viewer, for lining it up with the sky.
  const sight = useMemo<SightReadout | null>(() => {
    const gp = models.find((m) => m.model.structureSlug === 'great-pyramid');
    if (!gp) return null;
    const top = Number(gp.model.params.topHeight ?? gp.model.params.height);
    const eye: [number, number, number] = [
      standpoint.x,
      groundAt(standpoint.x, standpoint.z) + 1.7,
      standpoint.z,
    ];
    const apex: [number, number, number] = [gp.position[0], gp.position[1] + top, gp.position[2]];
    return { name: 'Great Pyramid', ...sightTo(eye, apex) };
  }, [models, standpoint, groundAt]);

  const onFocus = useCallback(
    (slug: string) => {
      dispatch({ type: 'setView', view: 'overview' });
      dispatch({ type: 'focusCamera', anchor: slug });
    },
    [dispatch]
  );

  const panel = state.panel;
  const panelOpen = panel.size !== 'icon';
  const [chatDraft, setChatDraft] = useState('');
  const walkInfo = useWalkInfo();

  // After acting on the scene from the panel, make room to see it: phones close the
  // sheet, the expanded panel narrows.
  const revealScene = useCallback(() => {
    if (panel.size === 'icon') return;
    const size = isPhone() ? 'icon' : 'phone';
    if (size !== panel.size) dispatch({ type: 'openPanel', tab: panel.tab, size });
  }, [dispatch, panel]);

  const onFocusStructure = useCallback(
    (structureSlug: string) => {
      const anchor = props.anchors.find(
        (a) => a.structureSlug === structureSlug && a.kind === 'structure-center'
      );
      if (!anchor) return;
      onFocus(anchor.slug);
      revealScene();
    },
    [props.anchors, onFocus, revealScene]
  );

  const onShowInSky = useCallback(
    (v: ShowInSky) => {
      dispatch({ type: 'setEpoch', year: v.year });
      dispatch({ type: 'setSkyTime', dayOfYear: v.dayOfYear, solarHour: v.solarHour });
      if (placed) {
        const { lat, lon } = fromLocal(placed.terrain.origin, standpoint.x, standpoint.z);
        dispatch({
          type: 'setStandpoint',
          standpoint: { lat, lon, heading: v.headingDeg, pitch: v.pitchDeg },
        });
      }
      dispatch({ type: 'setView', view: 'sky' });
      revealScene();
    },
    [dispatch, placed, standpoint, revealScene]
  );

  const onAsk = useCallback(
    (text: string) => {
      setChatDraft(text);
      revealScene();
      requestAnimationFrame(() => document.getElementById('scene-chat')?.focus());
    },
    [revealScene]
  );

  // Suggestions come from the site's own questions and alignments.
  const suggestions = useMemo(
    () => [
      ...props.panel.questions.map((q) => q.title),
      ...props.panel.alignments.map((a) => `Does the ${a.axisLabel} point at ${a.targetName}?`),
    ],
    [props.panel]
  );

  const loadError = terrain.error ?? manifest.error ?? sky.error;
  const hasSurviving = manifest.data?.models.some((m) => m.condition === 'surviving') ?? false;

  return (
    <div className="relative h-svh w-full overflow-hidden bg-[oklch(0.14_0.02_265)]">
      {placed && heights ? (
        <SceneCanvas
          terrain={placed.terrain}
          heights={heights}
          models={models}
          anchors={markers}
          dimensions={dimensions}
          sky={sky.result}
          stars={sky.attributes}
          constellations={skyFigures.data}
          layers={state.layers}
          focusTarget={focusTarget}
          view={state.view}
          standpoint={standpoint}
          walkWorld={walkWorld}
          groundAt={groundAt}
          onStandpoint={onStandpoint}
          focus={state.focus}
          highlights={state.highlights}
          onFocus={onFocus}
        />
      ) : (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-[oklch(0.8_0.03_85)]">
          {loadError ? `The scene could not load: ${loadError}` : 'Loading the plateau…'}
        </p>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-20 z-10 px-4 sm:top-18 sm:px-6">
        <LayerBar
          state={state}
          hasSurviving={hasSurviving}
          onLayer={(layer, on) => dispatch({ type: 'setLayer', layer, on })}
          onCondition={(condition) => dispatch({ type: 'setModelCondition', condition })}
          onView={(view) => dispatch({ type: 'setView', view })}
        />
      </div>

      {/* Floating panels share the Egypt theme in its dark variant: they sit on the scene. */}
      <div data-theme="egypt" className="dark contents">
        <div
          className={cn(
            'pointer-events-none absolute z-20',
            panel.size === 'icon' && 'top-34 right-3 sm:top-32 sm:right-4',
            panel.size === 'phone' &&
              'inset-x-0 top-34 bottom-0 sm:inset-x-auto sm:top-32 sm:right-4 sm:bottom-4 sm:w-[24rem]',
            panel.size === 'full' && 'inset-x-0 top-34 bottom-0 sm:inset-x-4 sm:top-32 sm:bottom-4'
          )}
        >
          <InfoPanel
            data={props.panel}
            tab={panel.tab}
            size={panel.size}
            onPanel={(tab, size) => dispatch({ type: 'openPanel', tab, size })}
            renderTab={(tab, wide) => {
              switch (tab) {
                case 'facts':
                  return (
                    <FactsTab
                      structures={props.panel.structures}
                      measurements={props.panel.measurements}
                      references={props.panel.references}
                      onFocusStructure={onFocusStructure}
                    />
                  );
                case 'sky':
                  return (
                    <SkyTab
                      alignments={props.panel.alignments}
                      claims={props.panel.claims}
                      stars={sky.rows}
                      latDeg={props.lat}
                      lonDeg={props.lon}
                      onShow={onShowInSky}
                    />
                  );
                case 'timeline':
                  return (
                    <TimelineTab events={props.panel.timeline} sources={props.panel.sources} />
                  );
                case 'views':
                  return (
                    <ViewsTab
                      questions={props.panel.questions}
                      claims={props.panel.claims}
                      proponents={props.panel.proponents}
                      sources={props.panel.sources}
                      wide={wide}
                      onAsk={onAsk}
                    />
                  );
              }
            }}
          />
        </div>

        {/* Wider screens: the walk readout sits top right, clear of the bottom controls
            and left of the panel (or its icon). Phones show it under the walk pad. */}
        {state.view === 'sky' && placed && walkInfo.show && panel.size !== 'full' ? (
          <WalkInfo
            sight={sight}
            id={`${walkInfo.id}-wide`}
            className={cn(
              'absolute top-32 z-20 max-sm:hidden',
              panel.size === 'phone' ? 'right-108' : 'right-18'
            )}
          />
        ) : null}

        {/* Bottom controls. Phones: walk pad, sky console, chat bar, stacked. Wider
            screens: console, chat bar and walk pad in one row when there is room
            (the chat bar moves above them when there isn't). An open panel takes the
            right side; expanded, it covers the controls and only the chat bar stays. */}
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0 z-30 p-3 @container sm:inset-x-4 sm:bottom-4 sm:p-0',
            panel.size === 'phone' && 'sm:right-104'
          )}
        >
          <div className="grid gap-2 [grid-template-areas:'pad'_'console'_'chat'] sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end sm:gap-3 sm:[grid-template-areas:'chat_chat'_'console_pad'] @min-[60rem]:grid-cols-[auto_minmax(0,1fr)_auto] @min-[60rem]:[grid-template-areas:'console_chat_pad']">
            {state.view === 'sky' && placed ? (
              <WalkPad
                sight={sight}
                moved={state.standpoint !== null}
                onReset={() => dispatch({ type: 'setStandpoint', standpoint: null })}
                info={walkInfo}
                className={cn(
                  'justify-self-end [grid-area:pad]',
                  panelOpen && 'max-sm:hidden',
                  panel.size === 'full' && 'hidden'
                )}
              />
            ) : null}
            <div
              className={cn(
                'pointer-events-none [grid-area:console]',
                panelOpen && 'max-sm:hidden',
                panel.size === 'full' && 'hidden'
              )}
            >
              <SkyConsole
                epoch={state.epoch}
                dayOfYear={state.sky.dayOfYear}
                solarHour={state.sky.solarHour}
                latDeg={props.lat}
                lonDeg={props.lon}
                sunAltDeg={sky.result ? sky.result.sun.alt / DEG : null}
                onEpoch={(year) => dispatch({ type: 'setEpoch', year })}
                onSkyTime={(t) => dispatch({ type: 'setSkyTime', ...t })}
              />
            </div>
            <ChatBar
              suggestions={suggestions}
              draft={chatDraft}
              onDraft={setChatDraft}
              quiet={panel.size === 'full'}
              className="mx-auto max-w-xl [grid-area:chat]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
