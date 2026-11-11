'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Streamdown } from 'streamdown';
import 'streamdown/styles.css';

import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { authClient } from '@/lib/auth/client';

const KEY_STORAGE = 'stone-and-star:anthropic-key';
const API_KEY_HEADER = 'x-anthropic-key';

function readStoredKey() {
  try {
    return sessionStorage.getItem(KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

/**
 * Milestone 1 chat: plain questions and answers, no tools. The visitor's key lives
 * in this tab's sessionStorage and is sent with each request; the server never
 * stores or logs it.
 */
export function BareChat({ localModel }: { localModel: boolean }) {
  const [apiKey, setApiKey] = useState(readStoredKey);
  const [input, setInput] = useState('');
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        headers: (): Record<string, string> => {
          const key = readStoredKey();
          return key ? { [API_KEY_HEADER]: key } : {};
        },
      })
  );
  const { messages, sendMessage, status, error, stop } = useChat({ transport });
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const pathname = usePathname();

  const busy = status === 'submitted' || status === 'streaming';
  const needsKey = !localModel && !apiKey.startsWith('sk-ant-');

  function saveKey(value: string) {
    setApiKey(value);
    try {
      if (value) sessionStorage.setItem(KEY_STORAGE, value);
      else sessionStorage.removeItem(KEY_STORAGE);
    } catch {
      // Storage blocked: the key still works for this page view via state.
    }
  }

  function submit() {
    const text = input.trim();
    if (!text || busy || needsKey) return;
    sendMessage({ text });
    setInput('');
  }

  const signedInChat = (
    <>
      {localModel ? null : (
        <div className="grid gap-2">
          <Label htmlFor="anthropic-key">Your Anthropic API key</Label>
          <Input
            id="anthropic-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="sk-ant-…"
            value={apiKey}
            onChange={(e) => saveKey(e.currentTarget.value.trim())}
            className="h-11"
          />
          <p className="text-xs text-muted-foreground">
            Kept in this browser tab only and sent with each question. Usage bills to your key.
          </p>
        </div>
      )}

      <ol aria-live="polite" className="flex flex-col gap-4">
        {messages.map((message) => (
          <li key={message.id} className={message.role === 'user' ? 'self-end' : ''}>
            <p className="sr-only">{message.role === 'user' ? 'You said:' : 'The guide said:'}</p>
            <div
              className={
                message.role === 'user'
                  ? 'max-w-prose rounded-xl bg-secondary px-4 py-2.5'
                  : 'max-w-prose leading-relaxed'
              }
            >
              {message.parts.map((part, i) =>
                part.type !== 'text' ? null : message.role === 'user' ? (
                  <span key={i}>{part.text}</span>
                ) : (
                  <Streamdown key={i} isAnimating={status === 'streaming'} className="guide-answer">
                    {part.text}
                  </Streamdown>
                )
              )}
            </div>
          </li>
        ))}
        {status === 'submitted' ? (
          <li className="text-sm text-muted-foreground">Thinking…</li>
        ) : null}
      </ol>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error.message || 'The guide could not answer. Try again.'}
        </p>
      ) : null}

      <form
        className="grid gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Label htmlFor="guide-question">Your question</Label>
        <Textarea
          id="guide-question"
          rows={3}
          maxLength={4000}
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="How old is the Great Sphinx, and why do people disagree?"
        />
        <div className="flex items-center gap-3">
          {busy ? (
            <Button type="button" variant="outline" className="h-11 px-5" onClick={() => stop()}>
              Stop
            </Button>
          ) : (
            <Button type="submit" className="h-11 px-5" disabled={!input.trim() || needsKey}>
              Ask
            </Button>
          )}
          {needsKey ? (
            <p className="text-sm text-muted-foreground">Add your API key to ask.</p>
          ) : null}
        </div>
      </form>
    </>
  );

  return (
    <section aria-labelledby="guide-heading" className="flex flex-col gap-5">
      <div>
        <h2 id="guide-heading" className="font-display text-2xl font-semibold tracking-wide">
          Ask the guide
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {localModel
            ? 'Running on the local Claude Code model (development only).'
            : 'Plain answers for now. Sources and scene control come in a later milestone.'}
        </p>
      </div>

      {sessionPending ? (
        <p className="text-sm text-muted-foreground">Checking sign-in…</p>
      ) : !session?.user ? (
        <div className="grid gap-3">
          <p className="leading-relaxed">
            Sign in to ask the guide. You’ll use your own Anthropic API key, kept in your browser.
          </p>
          <Link
            href={`/sign-in?next=${encodeURIComponent(pathname)}`}
            className={buttonVariants({ className: 'h-11 w-fit px-5' })}
          >
            Sign in
          </Link>
        </div>
      ) : (
        signedInChat
      )}
    </section>
  );
}
