'use client';

import { ArrowUp, X } from 'lucide-react';
import { useId, useRef, useState, type FormEvent } from 'react';

import { cn } from '@/lib/utils';

/**
 * The floating chat bar, as a shell: suggestions and an input, no AI yet. Asking
 * shows where the answer card will appear and points to the plain guide below the
 * scene. The guide joins the scene (answers, sources, scene actions) in milestone 5.
 */
export function ChatBar({
  suggestions,
  draft,
  onDraft,
  quiet = false,
  className,
}: {
  suggestions: string[];
  draft: string;
  onDraft: (text: string) => void;
  /** Show suggestions only while typing (over the expanded panel, to keep it readable). */
  quiet?: boolean;
  className?: string;
}) {
  const [asked, setAsked] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const answerId = useId();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setAsked(text);
    onDraft('');
  };

  return (
    <div className={cn('pointer-events-none flex w-full flex-col gap-2', className)}>
      {asked ? (
        <section
          id={answerId}
          aria-live="polite"
          aria-label="Guide answer"
          className="pointer-events-auto rounded-2xl border border-white/10 bg-background/90 p-4 text-sm/relaxed text-foreground shadow-lg backdrop-blur-md"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="font-heading text-lg/snug font-semibold">{asked}</p>
            <button
              type="button"
              onClick={() => setAsked(null)}
              aria-label="Close the answer"
              className="-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
          <p className="mt-1 text-muted-foreground">
            Answers here will cite sources and move the scene. That arrives with the guide’s tools.
            For now, ask the plain guide{' '}
            <a href="#guide-heading" className="text-foreground underline underline-offset-4">
              below the scene
            </a>
            .
          </p>
        </section>
      ) : null}

      <ul
        aria-label="Suggested questions"
        className={cn(
          'pointer-events-auto flex gap-2 overflow-x-auto scrollbar-none',
          // On phones (and over the expanded panel) suggestions show only while you type.
          !focused && !draft && (quiet ? 'hidden' : 'max-sm:hidden')
        )}
      >
        {suggestions.map((s) => (
          <li key={s} className="shrink-0">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onDraft(s);
                input.current?.focus();
              }}
              className="min-h-11 rounded-full border border-white/15 bg-background/70 px-3.5 text-sm whitespace-nowrap text-foreground/90 backdrop-blur-md transition-colors hover:bg-background/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {s}
            </button>
          </li>
        ))}
      </ul>

      <form
        onSubmit={submit}
        className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/15 bg-background/85 p-1.5 pl-5 shadow-[0_20px_60px_-20px_rgb(0_0_0/0.7)] backdrop-blur-md focus-within:border-primary/60"
      >
        <label htmlFor="scene-chat" className="sr-only">
          Ask about Giza
        </label>
        <input
          ref={input}
          id="scene-chat"
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Ask about Giza…"
          autoComplete="off"
          className="h-10 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground sm:text-sm"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Ask"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-40"
        >
          <ArrowUp aria-hidden className="size-5" />
        </button>
      </form>
    </div>
  );
}
