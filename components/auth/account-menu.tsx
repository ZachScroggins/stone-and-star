'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth/client';

const linkClass =
  'flex min-h-11 items-center rounded-lg px-3 text-sm font-medium hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none';

/** Header control: "Sign in" when signed out, the user's name and "Sign out" when in. */
export function AccountMenu() {
  const { data: session, isPending } = authClient.useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  if (isPending) {
    return <span className="block h-11 w-16" aria-hidden />;
  }

  if (!session?.user) {
    if (pathname === '/sign-in') return null;
    return (
      <Link href={`/sign-in?next=${encodeURIComponent(pathname)}`} className={linkClass}>
        Sign in
      </Link>
    );
  }

  const name = session.user.name?.split(' ')[0] || session.user.email;

  return (
    <div className="flex items-center gap-1">
      <span className="hidden max-w-32 truncate px-2 text-sm text-muted-foreground sm:block">
        {name}
      </span>
      <Button
        variant="ghost"
        className="h-11 px-3"
        disabled={signingOut}
        onClick={async () => {
          setSigningOut(true);
          await authClient.signOut();
          setSigningOut(false);
          router.refresh();
        }}
      >
        {signingOut ? 'Signing out…' : 'Sign out'}
      </Button>
    </div>
  );
}
