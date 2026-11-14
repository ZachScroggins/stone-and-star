'use client';

import dynamic from 'next/dynamic';

import type { GizaExplorerProps } from './giza-explorer';

// The explorer reads the URL, the clock and WebGL, so it renders only in the browser.
const GizaExplorer = dynamic(() => import('./giza-explorer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-svh w-full items-center justify-center bg-[oklch(0.14_0.02_265)] text-sm text-[oklch(0.8_0.03_85)]">
      Loading the plateau…
    </div>
  ),
});

export function GizaExplorerLoader(props: GizaExplorerProps) {
  return <GizaExplorer {...props} />;
}
