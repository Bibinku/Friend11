import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { Loader2, Send, X } from 'lucide-react';
import type { ChatMessage } from '../types';
import { CHAT_MESSAGE_MAX, validateChatMessage } from '../lib/validation';
import { activeMentionQuery, applyMention, mentionsUser, splitMentions } from '../lib/mentions';
import { fetchRecentMessages, sendChatMessage, subscribeToMessages } from '../services/chatService';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './Avatar';

const MAX_KEPT = 200;
const SEND_GAP_MS = 1200;
const SUGGESTION_LIMIT = 5;

const time = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

function merge(a: ChatMessage[], b: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  [...a, ...b].forEach((m) => byId.set(m.id, m));
  return [...byId.values()].sort((x, y) => x.createdAt - y.createdAt).slice(-MAX_KEPT);
}

/** A message's body as plain text + highlighted @mentions. */
function MessageBody({ body }: { body: string }) {
  return (
    <p>
      {splitMentions(body).map((seg, i) =>
        seg.isMention ? (
          <span key={i} className="mention">
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </p>
  );
}

export function ChatPanel({ onClose }: { onClose: () => void }) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [live, setLive] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);
  const [dismissedQuery, setDismissedQuery] = useState<string | null>(null);
  const [caret, setCaret] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const stick = useRef(true);
  const lastSent = useRef(0);

  async function load() {
    const { data, error: err } = await fetchRecentMessages();
    if (err) {
      setStatus((s) => (s === 'ready' ? s : 'error'));
      return;
    }
    setMessages((prev) => merge(prev, data));
    setStatus('ready');
  }

  useEffect(() => {
    const unsubscribe = subscribeToMessages((m) => setMessages((prev) => merge(prev, [m])), setLive);
    void load();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (live) return;
    const id = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(id);
  }, [live]);

  useEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Who can be @mentioned: people seen in this chat so far (excludes yourself).
  const participants = useMemo(() => {
    const byName = new Map<string, { username: string; avatarId: number }>();
    for (const m of messages) {
      if (m.userId === user?.id) continue;
      byName.set(m.username.toLowerCase(), { username: m.username, avatarId: m.avatarId });
    }
    return [...byName.values()];
  }, [messages, user?.id]);

  const mentionQuery = activeMentionQuery(draft, caret);
  const suggestions =
    mentionQuery === null || mentionQuery === dismissedQuery
      ? []
      : participants.filter((p) => p.username.toLowerCase().startsWith(mentionQuery.toLowerCase())).slice(0, SUGGESTION_LIMIT);

  function pickSuggestion(username: string) {
    const { text, caret: nextCaret } = applyMention(draft, caret, username);
    setDraft(text);
    setCaret(nextCaret);
    setHighlight(0);
    setDismissedQuery(null);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(nextCaret, nextCaret);
    });
  }

  function onInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      pickSuggestion(suggestions[highlight].username);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      setDismissedQuery(mentionQuery);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (suggestions.length > 0) return;
    const check = validateChatMessage(draft);
    if (!check.ok) return setError(check.error ?? null);
    if (Date.now() - lastSent.current < SEND_GAP_MS) return setError('Slow down a little.');
    setSending(true);
    setError(null);
    const res = await sendChatMessage(draft);
    setSending(false);
    if (!res.ok) return setError(res.error ?? 'Message didn’t send.');
    lastSent.current = Date.now();
    setDraft('');
    stick.current = true;
    if (!live) void load();
  }

  return (
    <section className="chat-panel" role="dialog" aria-label="Live Chat">
      <header className="chat-head">
        <div>
          <h2>Live Chat</h2>
          <span className={`live-dot${live ? ' is-live' : ''}`}>{live ? 'Live' : 'Connecting…'}</span>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close chat">
          <X size={20} aria-hidden="true" />
        </button>
      </header>

      <div
        className="chat-list"
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        aria-live="polite"
      >
        {status === 'loading' && (
          <p className="chat-empty">
            <Loader2 size={18} className="spin" aria-hidden="true" /> Loading messages…
          </p>
        )}
        {status === 'error' && (
          <div className="chat-empty">
            <p>Couldn’t load the chat.</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void load()}>
              Try again
            </button>
          </div>
        )}
        {status === 'ready' && messages.length === 0 && <p className="chat-empty">No messages yet. Say hello!</p>}
        {messages.map((m) => {
          const mine = m.userId === user?.id;
          const mentioned = !mine && mentionsUser(m.body, profile?.username);
          return (
            <div key={m.id} className={`msg${mine ? ' is-mine' : ''}${mentioned ? ' mentions-me' : ''}`}>
              {!mine && <Avatar id={m.avatarId} size={30} />}
              <div className="msg-body">
                <span className="msg-meta">
                  {mine ? 'You' : m.username} · {time(m.createdAt)}
                </span>
                <MessageBody body={m.body} />
              </div>
            </div>
          );
        })}
      </div>

      <form className="chat-form" onSubmit={submit}>
        <label className="sr-only" htmlFor="chat-input">
          Message
        </label>
        <div className="chat-input-wrap">
          {suggestions.length > 0 && (
            <ul className="mention-suggestions" role="listbox">
              {suggestions.map((p, i) => (
                <li key={p.username}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === highlight}
                    className={i === highlight ? 'is-active' : ''}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickSuggestion(p.username)}
                  >
                    <Avatar id={p.avatarId} size={22} />
                    {p.username}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input
            id="chat-input"
            ref={inputRef}
            className="field"
            value={draft}
            maxLength={CHAT_MESSAGE_MAX}
            autoComplete="off"
            enterKeyHint="send"
            placeholder="Write a message, @ to mention someone"
            onChange={(e) => {
              setDraft(e.target.value);
              setCaret(e.target.selectionStart ?? e.target.value.length);
              setHighlight(0);
              setError(null);
            }}
            onKeyDown={onInputKeyDown}
            onKeyUp={(e) => setCaret(e.currentTarget.selectionStart ?? draft.length)}
            onClick={(e) => setCaret(e.currentTarget.selectionStart ?? draft.length)}
          />
        </div>
        <button type="submit" className="btn btn-primary icon-send" disabled={sending || !draft.trim()} aria-label="Send message">
          {sending ? <Loader2 size={18} className="spin" aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
        </button>
      </form>
      {error && (
        <p className="form-error chat-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}