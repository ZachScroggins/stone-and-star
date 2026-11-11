import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SignInButtons } from '@/components/auth/sign-in-buttons';
import { LogoMark } from '@/components/brand/logo-mark';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';

export const metadata: Metadata = { title: 'Sign in' };

export default function SignInPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-start justify-center px-5 pt-12 pb-20 sm:pt-20">
        <div className="w-full max-w-sm">
          <LogoMark className="size-10" />
          <h1 className="mt-6 font-heading text-4xl font-semibold">Sign in</h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Browsing is open to everyone. Sign in to ask the guide; you’ll use your own Anthropic
            API key, which stays in your browser.
          </p>
          <div className="mt-8">
            <Suspense fallback={<div className="h-27" aria-hidden />}>
              <SignInButtons />
            </Suspense>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Your provider shares your name, email address and profile picture with Stone &amp; Star.
            Your API key is never sent to our database.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
