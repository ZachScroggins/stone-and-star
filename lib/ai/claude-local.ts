import 'server-only';

import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { claudeCode } from 'ai-sdk-provider-claude-code';

import type { ModelRole } from '@/lib/vocab';

// OWNER-ONLY, DEVELOPMENT-ONLY. Runs Claude Code on the owner's own subscription so
// the site can be tried locally without API cost. Anthropic's terms do not allow
// serving other people through consumer-plan credentials, so this module must never
// reach production: it is imported only behind a NODE_ENV === 'development' check
// (see models.ts) and `ai-sdk-provider-claude-code` is a devDependency.

if (process.env.NODE_ENV !== 'development') {
  throw new Error('claude-local is development-only');
}

// A neutral, empty working directory: the repo's CLAUDE.md / AGENTS.md (builder
// instructions) must never reach the guide.
const NEUTRAL_CWD = join(tmpdir(), 'stone-and-star-guide');
mkdirSync(NEUTRAL_CWD, { recursive: true });

export function localClaudeModel(role: ModelRole, systemPrompt: string) {
  return claudeCode(role === 'chat' ? 'sonnet' : 'haiku', {
    systemPrompt,
    cwd: NEUTRAL_CWD,
    // Load no user, project or local settings, hooks, skills or MCP servers.
    settingSources: [],
    // Disable every built-in tool (Bash, Read, Write, Edit, WebFetch, ...). App MCP
    // tools get allow-listed here in milestone 5.
    tools: [],
    allowedTools: [],
    permissionMode: 'dontAsk',
    permissionPrompts: 'none',
    maxTurns: 1,
    persistSession: false,
    // Visitor text is sent as written: no @file expansion or slash commands.
    verbatimPrompts: true,
    // The provider forwards ANTHROPIC_* variables to the subprocess. Strip API
    // credentials so this path always uses the owner's subscription login.
    env: { ANTHROPIC_API_KEY: undefined, ANTHROPIC_AUTH_TOKEN: undefined },
  });
}
