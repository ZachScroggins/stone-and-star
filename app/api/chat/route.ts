import {
  APICallError,
  convertToModelMessages,
  createUIMessageStreamResponse,
  safeValidateUIMessages,
  streamText,
  toUIMessageStream,
} from 'ai';
import { z } from 'zod';

import { getModel, isLocalClaudeEnabled } from '@/lib/ai/models';
import { GUIDE_SYSTEM_PROMPT } from '@/lib/ai/prompts';

export const maxDuration = 60;

/** Header that carries the visitor's own Anthropic key. Never logged or stored. */
export const API_KEY_HEADER = 'x-anthropic-key';

const MAX_MESSAGES = 40;
const MAX_TEXT_CHARS = 4000;

const Body = z.object({
  messages: z.array(z.unknown()).min(1).max(MAX_MESSAGES),
});

function jsonError(status: number, error: string) {
  return Response.json({ error }, { status });
}

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Defense in depth only: `request.url` carries the server's own origin, so read the
 * Host header the browser sent. The real guard is `npm run dev:local`, which binds
 * the dev server to 127.0.0.1 so other devices can't reach it at all.
 */
function isLocalhost(request: Request) {
  const host = request.headers.get('host');
  if (!host) return false;
  try {
    return LOCAL_HOSTNAMES.has(new URL(`http://${host}`).hostname);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  // Until sign-in lands (milestone 1, Neon Auth), the guide only runs on dev servers.
  if (process.env.NODE_ENV !== 'development') {
    return jsonError(403, 'Sign-in is required to use the guide.');
  }

  const local = isLocalClaudeEnabled();
  // The local Claude Code path uses the owner's subscription: owner's machine only.
  if (local && !isLocalhost(request)) {
    return jsonError(403, 'The local model is only available on localhost.');
  }

  const parsedBody = Body.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) {
    return jsonError(400, `Send between 1 and ${MAX_MESSAGES} messages.`);
  }
  const validated = await safeValidateUIMessages({ messages: parsedBody.data.messages });
  if (!validated.success) {
    return jsonError(400, 'Messages are malformed.');
  }
  const messages = validated.data;
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type === 'text' && part.text.length > MAX_TEXT_CHARS) {
        return jsonError(413, `Keep each message under ${MAX_TEXT_CHARS} characters.`);
      }
    }
  }

  const apiKey = request.headers.get(API_KEY_HEADER)?.trim() || undefined;
  if (!local && !apiKey?.startsWith('sk-ant-')) {
    return jsonError(401, 'Add your Anthropic API key to use the guide.');
  }

  const { model, callOptions } = await getModel('chat', { apiKey, system: GUIDE_SYSTEM_PROMPT });

  const result = streamText({
    model,
    ...callOptions,
    messages: await convertToModelMessages(messages),
    abortSignal: request.signal,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: (error) => {
        // Never echo provider errors verbatim: they can include request details.
        if (APICallError.isInstance(error)) {
          if (error.statusCode === 401) return 'That API key was rejected by Anthropic.';
          if (error.statusCode === 429) return 'Rate limited by Anthropic. Try again shortly.';
          if (error.statusCode === 529) return 'Anthropic is overloaded. Try again shortly.';
        }
        console.error('[chat] model error', error instanceof Error ? error.name : 'unknown');
        return 'The guide could not answer. Try again.';
      },
    }),
  });
}
