'use client';

import { ExternalLink, MessageCircleQuestion } from 'lucide-react';
import { useState } from 'react';

import type { Claim, Proponent, Question, Source } from '@/lib/contracts/claims';
import { cn } from '@/lib/utils';
import type { ViewSide } from '@/lib/vocab';

import { BulletList, ClaimLabels, PanelHeading, UnverifiedNote } from './labels';

const SIDE_LABELS: Record<ViewSide, string> = {
  mainstream: 'Mainstream view',
  alternative: 'Alternative view',
};

function SourceLinks({ slugs, sources }: { slugs: string[]; sources: Source[] }) {
  const list = sources.filter((s) => slugs.includes(s.slug));
  if (list.length === 0) {
    return <p className="text-sm text-muted-foreground">No sources linked yet.</p>;
  }
  return (
    <ul className="space-y-1 text-sm">
      {list.map((s) => (
        <li key={s.slug}>
          {s.url ? (
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
            >
              {s.title}
              <ExternalLink aria-hidden className="size-3.5" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : (
            s.title
          )}
          {s.authors.length > 0 ? (
            <span className="text-muted-foreground">, {s.authors.join(', ')}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function ClaimCard({
  claim,
  proponents,
  sources,
}: {
  claim: Claim;
  proponents: Proponent[];
  sources: Source[];
}) {
  const who = proponents.filter((p) => claim.proponentSlugs.includes(p.slug));
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-border bg-background/40 p-4">
      <header className="space-y-2.5">
        <p className="text-xs text-muted-foreground">{claim.side ? SIDE_LABELS[claim.side] : ''}</p>
        <p className="font-heading text-lg/snug font-semibold">{claim.statement}</p>
        <ClaimLabels reception={claim.reception} basis={claim.basis} />
      </header>

      <section className="space-y-1.5">
        <h4 className="text-xs font-medium text-muted-foreground">Who argues it</h4>
        {who.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {who.map((p) => (
              <li key={p.slug}>
                <span className="font-medium">{p.name}</span>
                <span className="text-muted-foreground">: {p.description}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">{claim.heldBy ?? 'Not yet recorded.'}</p>
        )}
      </section>

      <section className="space-y-1.5">
        <h4 className="text-xs font-medium text-muted-foreground">Evidence cited</h4>
        <BulletList items={claim.evidenceCited} empty="None recorded yet." />
      </section>

      <section className="space-y-1.5">
        <h4 className="text-xs font-medium text-muted-foreground">Limits and objections</h4>
        <BulletList items={claim.limits} empty="None recorded yet." />
      </section>

      <section className="space-y-1.5">
        <h4 className="text-xs font-medium text-muted-foreground">Sources</h4>
        <SourceLinks slugs={claim.sourceSlugs} sources={sources} />
      </section>
    </article>
  );
}

/**
 * Mainstream and alternative answers to one question, facing each other. In the
 * phone-width panel they stack; expanded, they sit side by side.
 */
export function ViewsTab({
  questions,
  claims,
  proponents,
  sources,
  wide,
  onAsk,
}: {
  questions: Question[];
  claims: Claim[];
  proponents: Proponent[];
  sources: Source[];
  /** The panel is expanded: put the two sides next to each other. */
  wide: boolean;
  onAsk: (text: string) => void;
}) {
  const answered = questions.filter((q) => claims.some((c) => c.questionSlug === q.slug));
  const [selected, setSelected] = useState(answered[0]?.slug ?? null);
  const question = answered.find((q) => q.slug === selected) ?? answered[0];
  if (!question) return null;
  const sides = (['mainstream', 'alternative'] as const).map((side) => ({
    side,
    claims: claims.filter((c) => c.questionSlug === question.slug && c.side === side),
  }));

  return (
    <div className="space-y-6">
      {answered.length > 1 ? (
        <nav aria-label="Questions">
          <ul className="flex flex-wrap gap-2">
            {answered.map((q) => (
              <li key={q.slug}>
                <button
                  type="button"
                  aria-pressed={q.slug === question.slug}
                  onClick={() => setSelected(q.slug)}
                  className="min-h-11 rounded-full border border-border px-3.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-pressed:border-primary/70 aria-pressed:bg-primary/15 aria-pressed:text-foreground"
                >
                  {q.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <h2 className="font-heading text-3xl/tight font-medium text-balance italic sm:text-4xl/tight">
        {question.title}
      </h2>

      <div className={cn('grid gap-4', wide && 'lg:grid-cols-2')}>
        {sides.map(({ side, claims: list }) =>
          list.length > 0 ? (
            <div key={side} className="space-y-4">
              {list.map((c) => (
                <ClaimCard key={c.slug} claim={c} proponents={proponents} sources={sources} />
              ))}
            </div>
          ) : (
            <p key={side} className="rounded-xl border border-dashed border-border p-4 text-sm">
              No {SIDE_LABELS[side].toLowerCase()} recorded for this question yet.
            </p>
          )
        )}
      </div>

      <div className={cn('grid gap-6', wide && 'lg:grid-cols-3')}>
        <section className="space-y-2">
          <PanelHeading>Where they agree</PanelHeading>
          <BulletList items={question.agreements} empty="Not recorded yet." />
        </section>
        <section className="space-y-2">
          <PanelHeading>Where they differ</PanelHeading>
          <BulletList items={question.differences} empty="Not recorded yet." />
        </section>
        <section className="space-y-2">
          <PanelHeading>What would settle it</PanelHeading>
          <BulletList items={question.whatWouldSettleIt} empty="Not recorded yet." />
        </section>
      </div>

      <button
        type="button"
        onClick={() => onAsk(question.title)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/60 px-4 text-sm font-medium text-foreground transition-colors hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <MessageCircleQuestion aria-hidden className="size-4" />
        Ask the guide about this
      </button>

      {question.unverified ? <UnverifiedNote /> : null}
    </div>
  );
}
