import { cn } from '@/lib/utils';

/** Four-point star path centred on (cx, cy) with radius r. */
export function starPath(cx: number, cy: number, r: number) {
  return `M${cx} ${cy - r}Q${cx} ${cy} ${cx + r} ${cy}Q${cx} ${cy} ${cx} ${cy + r}Q${cx} ${cy} ${cx - r} ${cy}Q${cx} ${cy} ${cx} ${cy - r}Z`;
}

/**
 * The Stone & Star mark: a triangle with a four-point star at its apex and a dashed
 * sight line rising from it. Standalone; it does not replace the ampersand.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('size-8', className)}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path
        d="M4 29 16 12 28 29Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M16 9.5V1.5"
        stroke="var(--star)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="1.6 2.2"
      />
      <path d={starPath(16, 12, 3.4)} fill="var(--star)" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-heading text-xl font-semibold tracking-wide', className)}>
      Stone &amp; Star
    </span>
  );
}
