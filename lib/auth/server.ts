import 'server-only';

import { createNeonAuth } from '@neon/auth/next/server';

// Neon Auth (Managed Better Auth). Users and sessions live in the `neon_auth`
// schema; the app keeps its own bans, guest passes and usage in its own tables.

function requireEnv(name: 'NEON_AUTH_BASE_URL' | 'NEON_AUTH_COOKIE_SECRET') {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Run \`vercel env pull .env.local\`.`);
  }
  return value;
}

export const auth = createNeonAuth({
  baseUrl: requireEnv('NEON_AUTH_BASE_URL'),
  cookies: { secret: requireEnv('NEON_AUTH_COOKIE_SECRET') },
});

/** The signed-in user, or null. Reads cookies, so callers render dynamically. */
export async function getCurrentUser() {
  const { data: session } = await auth.getSession();
  return session?.user ?? null;
}
