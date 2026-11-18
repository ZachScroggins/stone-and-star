import type { ReactNode } from 'react';

import { BASIS_LABELS, RECEPTION_LABELS } from '@/lib/facts/format';
import { cn } from '@/lib/utils';
import type { Basis, Reception } from '@/lib/vocab';

// Two labels per claim (planning handoff, section 5). Reception is a filled pill and
// basis an outlined, square-cornered tag: shape tells the two axes apart. Every value
// uses the same neutral colour, so "Minority view" never looks like "wrong".

export function ReceptionChip({ value, className }: { value: Reception; className?: string }) {
  return (
    <span
      title="Reception: where the claim stands among specialists"
      className={cn(
        'inline-flex h-6 items-center rounded-full bg-foreground/12 px-2.5 text-xs font-medium text-foreground',
        className
      )}
    >
      {RECEPTION_LABELS[value]}
    </span>
  );
}

export function BasisTag({ value, className }: { value: Basis; className?: string }) {
  return (
    <span
      title="Basis: what kind of claim it is"
      className={cn(
        'inline-flex h-6 items-center rounded-sm border border-foreground/25 px-2 text-xs text-foreground/85',
        className
      )}
    >
      {BASIS_LABELS[value]}
    </span>
  );
}

export function ClaimLabels({ reception, basis }: { reception: Reception; basis: Basis }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      <ReceptionChip value={reception} />
      <BasisTag value={basis} />
    </span>
  );
}

/** Marks a placeholder record. Plain text, not colour, carries the meaning. */
export function UnverifiedNote({ children }: { children?: ReactNode }) {
  return (
    <p className="border-l-2 border-ember pl-3 text-xs/relaxed text-muted-foreground">
      {children ?? 'Placeholder from the planning notes. Not yet checked against a source.'}
    </p>
  );
}

/** A short heading inside a tab. Sentence case; the type, not caps, does the work. */
export function PanelHeading({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h3 id={id} className="font-heading text-xl/tight font-semibold text-foreground">
      {children}
    </h3>
  );
}

export function BulletList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="space-y-1.5 text-sm/relaxed">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span aria-hidden className="mt-2.25 size-1 shrink-0 rounded-full bg-foreground/50" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
