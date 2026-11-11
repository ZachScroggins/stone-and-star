import Link from 'next/link';

import { AccountMenu } from '@/components/auth/account-menu';
import { LogoMark, Wordmark } from '@/components/brand/logo-mark';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

export function SiteHeader({ siteName }: { siteName?: string }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
      <Link
        href="/"
        className="-mx-2 flex min-h-11 items-center gap-2.5 rounded-lg px-2 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <LogoMark className="size-7" />
        <Wordmark />
        {siteName ? (
          <span className="hidden font-heading text-xl text-muted-foreground sm:inline">
            · {siteName}
          </span>
        ) : null}
      </Link>
      <nav aria-label="Main" className="flex items-center gap-1 whitespace-nowrap">
        <Link
          href="/giza"
          className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          Giza
        </Link>
        <AccountMenu />
        <ThemeToggle />
      </nav>
    </header>
  );
}

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn('border-t', className)}>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground sm:px-8">
        <div className="flex items-center gap-2.5">
          <LogoMark className="size-6 text-foreground" />
          <p className="font-heading text-lg text-foreground italic">Every claim, measured.</p>
        </div>
        <p>Data on this site is placeholder until it has been sourced and reviewed.</p>
      </div>
    </footer>
  );
}
