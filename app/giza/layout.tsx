import { Cinzel } from 'next/font/google';

import { cn } from '@/lib/utils';

const fontDisplay = Cinzel({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-display',
});

// Each site sets its theme here; the panels and chat bar inherit it.
export default function GizaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-theme="egypt"
      className={cn(fontDisplay.variable, 'min-h-svh bg-background text-foreground')}
    >
      {children}
    </div>
  );
}
