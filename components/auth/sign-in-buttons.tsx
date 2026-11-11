'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth/client';
import { safeNextPath } from '@/lib/auth/redirect';

export type Provider = 'google' | 'github';

const PROVIDERS: { id: Provider; label: string; icon: React.ReactNode }[] = [
  {
    id: 'google',
    label: 'Continue with Google',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden className="size-5">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.6 10.6 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
        />
      </svg>
    ),
  },
  {
    id: 'github',
    label: 'Continue with GitHub',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden className="size-5" fill="currentColor">
        <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z" />
      </svg>
    ),
  },
];

export function SignInButtons({ providers }: { providers: Provider[] }) {
  const params = useSearchParams();
  const next = safeNextPath(params.get('next'));
  const returnedError = params.get('error');
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(
    returnedError ? 'Sign-in didn’t finish. Try again.' : null
  );

  async function signIn(provider: Provider) {
    setPending(provider);
    setError(null);
    try {
      const { error } = await authClient.signIn.social({
        provider,
        callbackURL: `${window.location.origin}${next}`,
      });
      if (error) {
        setError(error.message || 'Sign-in couldn’t start. Try again.');
        setPending(null);
      }
      // On success the browser leaves this page for the provider.
    } catch {
      setError('Sign-in couldn’t start. Check your connection and try again.');
      setPending(null);
    }
  }

  return (
    <div className="grid gap-3">
      {PROVIDERS.filter((p) => providers.includes(p.id)).map((p) => (
        <Button
          key={p.id}
          type="button"
          variant="outline"
          className="h-12 justify-center gap-3 text-base"
          disabled={pending !== null}
          aria-busy={pending === p.id}
          onClick={() => signIn(p.id)}
        >
          {p.icon}
          {pending === p.id ? 'Opening…' : p.label}
        </Button>
      ))}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
