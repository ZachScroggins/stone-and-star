'use client';

import { useEffect, useState, type CSSProperties, type RefObject } from 'react';

const FADE = '2.5rem';

/**
 * Fades a horizontal scroller's edges where more content hides past them, as a CSS
 * mask: the right edge while it overflows, the left once it is scrolled. Returns the
 * style to put on the scroller (undefined when everything fits).
 */
export function useEdgeFade(ref: RefObject<HTMLElement | null>): CSSProperties | undefined {
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    const el = ref.current;
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
  }, [ref]);

  if (!edges.start && !edges.end) return undefined;
  const mask = `linear-gradient(to right, ${edges.start ? `transparent, black ${FADE}` : 'black'}, ${
    edges.end ? `black calc(100% - ${FADE}), transparent` : 'black'
  })`;
  return { maskImage: mask, WebkitMaskImage: mask };
}
