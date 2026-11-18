'use client';

import { useEffect, useState, type CSSProperties } from 'react';

const FADE = '2.5rem';

/**
 * Fades a horizontal scroller's edges where more content hides past them, as a CSS
 * mask: the right edge while it overflows, the left once it is scrolled. Returns a
 * callback ref for the scroller and the style to put on it (undefined when everything
 * fits). The callback ref re-attaches when the scroller mounts later (a closed panel).
 */
export function useEdgeFade<T extends HTMLElement>() {
  const [el, setEl] = useState<T | null>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const start = el.scrollLeft > 1;
      const end = max - el.scrollLeft > 1;
      setEdges((e) => (e.start === start && e.end === end ? e : { start, end }));
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    for (const child of el.children) observer.observe(child);
    return () => {
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [el]);

  let style: CSSProperties | undefined;
  if (edges.start || edges.end) {
    const mask = `linear-gradient(to right, ${edges.start ? `transparent, black ${FADE}` : 'black'}, ${
      edges.end ? `black calc(100% - ${FADE}), transparent` : 'black'
    })`;
    style = { maskImage: mask, WebkitMaskImage: mask };
  }
  return [setEl, style] as const;
}
