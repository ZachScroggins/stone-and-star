/**
 * Where to send someone after sign-in. Only same-site paths are allowed, so a
 * crafted `?next=` can't bounce a visitor to another site.
 */
export function safeNextPath(next: string | null | undefined, fallback = '/'): string {
  if (!next || next.length > 512) return fallback;
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return fallback;
  try {
    const url = new URL(next, 'http://same.invalid');
    if (url.origin !== 'http://same.invalid') return fallback;
    // Normalizing can turn `/a/..//host` into `//host`, which browsers read as a site.
    if (url.pathname.startsWith('//') || url.pathname === '/sign-in') return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
