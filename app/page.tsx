import Link from 'next/link';

import { SightlineHero } from '@/components/brand/sightline-hero';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const RECEPTION_LABELS = [
  ['Consensus', 'Broadly accepted by specialists in the field.'],
  ['Debated', 'Specialists actively disagree; no settled majority.'],
  ['Minority view', 'Held by some, not accepted by most specialists.'],
  ['Not yet assessed', 'No specialist response yet.'],
  ['Withdrawn', 'Retracted or abandoned by its own proponents or publisher.'],
] as const;

const BASIS_LABELS = [
  ['Measured', 'A direct measurement or survey.'],
  ['Documented', 'Ancient records, inscriptions or texts.'],
  ['Inferred', 'An interpretation of physical evidence.'],
  ['Numerical pattern', 'A mathematical relationship with no independent evidence of intent.'],
  ['Hypothesis', 'Proposed, with no direct evidence yet.'],
] as const;

const SITES = [
  { name: 'Giza', note: 'The first site. Being built now.', href: '/giza' },
  { name: 'Stonehenge', note: 'After Giza.' },
  { name: 'Göbekli Tepe', note: 'After Giza.' },
  { name: 'Machu Picchu', note: 'After Giza.' },
] as const;

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pt-10 pb-16 sm:px-8 md:grid-cols-[1.15fr_1fr] md:pt-16 md:pb-24">
          <div>
            <h1 className="font-heading text-5xl leading-[1.04] font-semibold sm:text-6xl">
              <span className="block">Measure the monuments.</span>
              <span className="block">Read the sky.</span>
              <span className="block">Weigh the evidence.</span>
            </h1>
            <p className="mt-6 max-w-prose text-lg/relaxed text-muted-foreground">
              Explore ancient sites in 3D: their measurements, their possible alignments with the
              stars, and the competing explanations for how old they are and how they were built.
              Mainstream and alternative views sit side by side, and every claim shows its sources.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/giza" className={cn(buttonVariants(), 'h-11 px-5 text-base')}>
                Explore Giza
              </Link>
              <Link
                href="#labels"
                className={cn(buttonVariants({ variant: 'outline' }), 'h-11 px-5 text-base')}
              >
                How claims are labelled
              </Link>
            </div>
          </div>
          <SightlineHero className="w-full text-foreground" />
        </section>

        <section id="labels" className="scroll-mt-6 border-t">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 md:py-20">
            <div className="max-w-2xl">
              <h2 className="font-heading text-4xl font-semibold">Two labels on every claim</h2>
              <p className="mt-4 text-lg/relaxed text-muted-foreground">
                One word can’t say both how specialists regard a claim and what it rests on. So each
                claim carries two labels, each citing its basis. Neither label means right or wrong,
                and the site never picks a winner on a contested question.
              </p>
            </div>
            <div className="mt-10 grid gap-10 md:grid-cols-2">
              <LabelList
                title="Reception"
                intro="Where the claim stands among relevant specialists."
                items={RECEPTION_LABELS}
                chip="filled"
              />
              <LabelList
                title="Basis"
                intro="What kind of evidence the claim rests on."
                items={BASIS_LABELS}
                chip="outlined"
              />
            </div>
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-2 md:py-20">
            <div>
              <h2 className="font-heading text-4xl font-semibold">Sites</h2>
              <p className="mt-4 max-w-prose leading-relaxed text-muted-foreground">
                Giza comes first because it has everything: measurements, sky alignments, a long
                timeline and a live debate about its age. Other sites follow once Giza is complete.
              </p>
              <ul className="mt-6 divide-y border-y">
                {SITES.map((site) => (
                  <li key={site.name} className="flex items-baseline justify-between gap-4 py-3">
                    {'href' in site ? (
                      <Link
                        href={site.href}
                        className="font-heading text-2xl font-semibold underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                      >
                        {site.name}
                      </Link>
                    ) : (
                      <span className="font-heading text-2xl text-muted-foreground">
                        {site.name}
                      </span>
                    )}
                    <span className="text-sm text-muted-foreground">{site.note}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-heading text-4xl font-semibold">Ways to explore</h2>
              <dl className="mt-6 space-y-6">
                <div>
                  <dt className="font-medium">Browse</dt>
                  <dd className="mt-1 leading-relaxed text-muted-foreground">
                    No account needed. The 3D scene, the sky, measurements, the timeline and every
                    view are open to everyone.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">Ask the guide</dt>
                  <dd className="mt-1 leading-relaxed text-muted-foreground">
                    Sign in and add your own Anthropic API key. The guide answers with sources and
                    moves the scene to show you. Your key stays in your browser.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">Guest pass</dt>
                  <dd className="mt-1 leading-relaxed text-muted-foreground">
                    Short-lived links for reviewers, with a fixed budget.
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function LabelList({
  title,
  intro,
  items,
  chip,
}: {
  title: string;
  intro: string;
  items: readonly (readonly [string, string])[];
  chip: 'filled' | 'outlined';
}) {
  return (
    <div>
      <h3 className="text-xl font-medium">{title}</h3>
      <p className="mt-1 text-muted-foreground">{intro}</p>
      <dl className="mt-5 space-y-4">
        {items.map(([label, meaning]) => (
          <div key={label} className="grid gap-1.5 sm:grid-cols-[10.5rem_1fr] sm:gap-4">
            <dt>
              <span
                className={cn(
                  'inline-flex rounded-full px-3 py-1 text-sm font-medium',
                  chip === 'filled'
                    ? 'bg-foreground text-background'
                    : 'border border-foreground/40'
                )}
              >
                {label}
              </span>
            </dt>
            <dd className="leading-relaxed text-muted-foreground sm:pt-1">{meaning}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
