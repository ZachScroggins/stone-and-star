'use client';

import { MoonIcon, SunIcon } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      className="size-11"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label="Switch between light and dark mode"
    >
      {/* Both icons render; CSS picks one, so server and client markup match. */}
      <SunIcon className="hidden size-5 dark:block" aria-hidden />
      <MoonIcon className="block size-5 dark:hidden" aria-hidden />
    </Button>
  );
}
