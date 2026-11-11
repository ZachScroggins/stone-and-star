import 'server-only';

import { createAnthropic, type AnthropicLanguageModelOptions } from '@ai-sdk/anthropic';
import type { LanguageModel, streamText } from 'ai';

import type { KeySource, ModelRole } from '@/lib/vocab';

type ProviderOptions = NonNullable<Parameters<typeof streamText>[0]['providerOptions']>;

/** Pinned model IDs (Anthropic docs, 2026-11). Change them here only. */
export const MODEL_IDS: Record<ModelRole, string> = {
  chat: 'claude-sonnet-5-5',
  guard: 'claude-haiku-5-5',
};

const MAX_OUTPUT_TOKENS: Record<ModelRole, number> = { chat: 2000, guard: 256 };

const PROVIDER_OPTIONS: Record<ModelRole, ProviderOptions> = {
  // Chat is conversational: low effort keeps answers quick. On a safety-classifier
  // block, let the API retry on its recommended fallback model.
  chat: {
    anthropic: { effort: 'low', fallbacks: 'default' } satisfies AnthropicLanguageModelOptions,
  },
  // Guard is cheap classification (milestone 5).
  guard: { anthropic: { effort: 'low' } satisfies AnthropicLanguageModelOptions },
};

export type ResolvedModel = {
  model: LanguageModel;
  keySource: KeySource;
  /** Spread into `streamText` / `generateText`. */
  callOptions: {
    system?: string;
    maxOutputTokens?: number;
    providerOptions?: ProviderOptions;
  };
};

/**
 * True only when the owner opted into the local Claude Code path on a dev server.
 * `process.env.NODE_ENV` is inlined at build time, so production builds compile
 * this to `false` and drop the local provider import entirely.
 */
export function isLocalClaudeEnabled(): boolean {
  return process.env.NODE_ENV === 'development' && process.env.MODEL_PROVIDER === 'claude-local';
}

/** Every model call goes through here. */
export async function getModel(
  role: ModelRole,
  opts: { apiKey?: string; system: string }
): Promise<ResolvedModel> {
  if (process.env.NODE_ENV === 'development') {
    if (process.env.MODEL_PROVIDER === 'claude-local') {
      const { localClaudeModel } = await import('./claude-local');
      // The provider folds a `system` call option into the user prompt, so the
      // local path sets its own system prompt instead.
      return {
        model: localClaudeModel(role, opts.system),
        keySource: 'dev_local',
        callOptions: {},
      };
    }
  }

  if (!opts.apiKey) {
    throw new MissingApiKeyError();
  }
  return {
    model: createAnthropic({ apiKey: opts.apiKey })(MODEL_IDS[role]),
    keySource: 'byok_anthropic',
    callOptions: {
      system: opts.system,
      maxOutputTokens: MAX_OUTPUT_TOKENS[role],
      providerOptions: PROVIDER_OPTIONS[role],
    },
  };
}

export class MissingApiKeyError extends Error {
  constructor() {
    super('An Anthropic API key is required');
    this.name = 'MissingApiKeyError';
  }
}
