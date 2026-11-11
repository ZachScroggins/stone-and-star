import { auth } from '@/lib/auth/server';

// Same-origin proxy to Neon Auth for the browser client.
export const { GET, POST, PUT, DELETE, PATCH } = auth.handler();
