import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { CornerUpLeft, Copy, Info, Loader2, Reply, Send, Trash2, X } from 'lucide-react';
import type { ChatMessage, ChatReaction } from '../types';
import { REACTION_EMOJIS } from '../types';
import { CHAT_MESSAGE_MAX, validateChatMessage } from '../lib/validation';
import { activeMentionQuery, applyMention, mentionsUser, splitMentions } from '../lib/mentions';
import { copyText } from '../lib/clipboard';
import {
  deleteChatMessage,
  fetchReactions,
  fetchRecentMessages,
  sendChatMessage,
  setMessageReaction,
  subscribeToMessages,
  subscribeToReactions,
} from '../services/chatService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from './Avatar';
import { ConfirmModal } from './ConfirmModal';
import { MessageInfoModal } from './MessageInfoModal';

const MAX_KEPT = 200;
const SEND_GAP_MS = 1200;
const SUGGESTION_LIMIT = 5;
const LONG_PRESS_MS = 500;

const time = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

function merge(a: ChatMessage[], b: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  [...a, ...b].forEach((m) => byId.set(m.id, m));
  return [...byId.values()].sort((x, y) => x.createdAt - y.createdAt).slice(-MAX_KEPT);
}

/** Reactions on one message, grouped into counts, plus which one (if any) is mine. */
function summarize(reactions: ChatReaction[], messageId: string, myUserId: string | undefined) {
  const counts = new Map<string, number>();
  let mine: string | null = null;
  for (const r of reactions) {
    if (r.messageId !== messageId) continue;
    counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
    if (myUserId && r.userId === myUserId) mine = r.emoji;
  }
  return { counts: [...counts.entries()], mine };
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
  const showToast = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [live, setLive] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);
  const [dismissedQuery, setDismissedQuery] = useState<string | null>(null);
  const [caret, setCaret] = useState(0);

  // Long-press (touch) / right-click (desktop) message actions.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<ChatReaction[]>([]);
  const [infoMessage, setInfoMessage] = useState<ChatMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChatMessage | null>(null);

  // The quoted-reply preview above the composer, WhatsApp-style.
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const bubbleRefs = useRef(new Map<string, HTMLDivElement>());
  const flashTimer = useRef<number | undefined>(undefined);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const stick = useRef(true);
  const lastSent = useRef(0);
  const pressTimer = useRef<number | undefined>(undefined);
  const messagesRef = useRef<ChatMessage[]>([]);
  const arrivals = useRef(new Map<string, number>()); // id → when it arrived live
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  async function load() {
    const startedAt = performance.now();
    const { data, error: err } = await fetchRecentMessages();
    if (err) {
      setStatus((s) => (s === 'ready' ? s : 'error'));
      return;
    }
    // Replace (rather than merge) so a message someone deleted really
    // disappears — but keep any message that arrived live while this fetch
    // was still in flight, since the fetch may not include it.
    setMessages((prev) => {
      const late = prev.filter((m) => (arrivals.current.get(m.id) ?? 0) > startedAt && !data.some((d) => d.id === m.id));
      return late.length ? merge(data, late) : data;
    });
    setStatus('ready');
  }

  async function loadReactions(ids: string[]) {
    if (ids.length === 0) return;
    const { data } = await fetchReactions(ids);
    setReactions(data);
  }

  useEffect(() => {
    // Subscribe first, then load history, so nothing sent in between is missed.
    const unsubscribe = subscribeToMessages(
      (m) => {
        arrivals.current.set(m.id, performance.now());
        setMessages((prev) => merge(prev, [m]));
      },
      setLive,
      (id) => {
        setMessages((prev) => prev.filter((m) => m.id !== id));
        setSelectedId((cur) => (cur === id ? null : cur));
      },
    );
    void load();
    return unsubscribe;
  }, []);

  // Realtime not connected (or not enabled on the table): fall back to polling,
  // for messages AND for other people's reactions.
  useEffect(() => {
    if (live) return;
    const id = window.setInterval(() => {
      void load();
      void loadReactions(messagesRef.current.map((m) => m.id));
    }, 8000);
    return () => window.clearInterval(id);
  }, [live]);

  // Reactions: load for whatever is currently on screen, and keep them live.
  useEffect(() => {
    void loadReactions(messages.map((m) => m.id));
  }, [messages.length]);

  useEffect(() => {
    const unsubscribe = subscribeToReactions(() => {
      void loadReactions(messagesRef.current.map((m) => m.id));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => () => {
    window.clearTimeout(pressTimer.current);
    window.clearTimeout(flashTimer.current);
  }, []);

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
    if (suggestions.length > 0) return; // Enter with the dropdown open picks a suggestion instead
    const check = validateChatMessage(draft);
    if (!check.ok) return setError(check.error ?? null);
    if (Date.now() - lastSent.current < SEND_GAP_MS) return setError('Slow down a little.');
    setSending(true);
    setError(null);
    const res = await sendChatMessage(draft, replyTo?.id ?? null);
    setSending(false);
    if (!res.ok) return setError(res.error ?? 'Message didn’t send.');
    lastSent.current = Date.now();
    setDraft('');
    setReplyTo(null);
    stick.current = true;
    if (!live) void load(); // realtime not connected: pull the new message in
  }

  /** Scrolls to and briefly highlights a message that's still loaded. If it
   * has scrolled out of the loaded history, says so instead of doing nothing. */
  function jumpTo(id: string) {
    const el = bubbleRefs.current.get(id);
    if (!el) {
      showToast('That message is further up — scroll to find it.', 'info');
      return;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.clearTimeout(flashTimer.current);
    setFlashId(id);
    flashTimer.current = window.setTimeout(() => setFlashId(null), 1500);
  }

  // ── Long-press / right-click message actions ─────────────────────────
  const selectedMessage = messages.find((m) => m.id === selectedId) ?? null;

  function startLongPress(m: ChatMessage) {
    window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => setSelectedId(m.id), LONG_PRESS_MS);
  }
  function cancelLongPress() {
    window.clearTimeout(pressTimer.current);
  }
  function openActions(e: { preventDefault: () => void }, m: ChatMessage) {
    e.preventDefault();
    setSelectedId(m.id);
  }
  function clearSelection() {
    setSelectedId(null);
  }

  async function copySelected() {
    if (!selectedMessage) return;
    const ok = await copyText(selectedMessage.body);
    showToast(ok ? 'Message copied' : 'Couldn’t copy. Try again.', ok ? 'success' : 'error');
    clearSelection();
  }
  function replySelected() {
    if (!selectedMessage) return;
    setReplyTo(selectedMessage);
    const text = `@${selectedMessage.username} `;
    setDraft(text);
    setCaret(text.length);
    clearSelection();
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(text.length, text.length);
    });
  }
  function infoSelected() {
    if (!selectedMessage) return;
    setInfoMessage(selectedMessage);
    clearSelection();
  }
  function askDeleteSelected() {
    if (!selectedMessage) return;
    setDeleteTarget(selectedMessage);
    clearSelection();
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    const res = await deleteChatMessage(id);
    setDeleteTarget(null);
    if (res.ok) setMessages((prev) => prev.filter((m) => m.id !== id));
    else showToast(res.error ?? 'Couldn’t delete the message.', 'error');
  }

  async function react(m: ChatMessage, emoji: string) {
    const mineNow = reactions.find((r) => r.messageId === m.id && r.userId === user?.id)?.emoji;
    const next = mineNow === emoji ? null : emoji; // tapping the same emoji again removes it
    clearSelection();
    setReactions((prev) => {
      const withoutMine = prev.filter((r) => !(r.messageId === m.id && r.userId === user?.id));
      return next && user ? [...withoutMine, { messageId: m.id, userId: user.id, emoji: next }] : withoutMine;
    });
    const res = await setMessageReaction(m.id, next);
    if (!res.ok) {
      showToast(res.error ?? 'Couldn’t save your reaction.', 'error');
      void loadReactions(messagesRef.current.map((mm) => mm.id)); // resync on failure
    }
  }

  return (
    <section className="chat-panel" role="dialog" aria-label="Live Chat">
      {selectedId ? (
        <header className="chat-head chat-head-selection">
          <button type="button" className="icon-btn" onClick={clearSelection} aria-label="Cancel selection">
            <X size={20} aria-hidden="true" />
          </button>
          <span className="chat-head-selection-label">1 selected</span>
          <div className="chat-head-actions">
            <button type="button" className="icon-btn" onClick={() => void copySelected()} aria-label="Copy message">
              <Copy size={19} aria-hidden="true" />
            </button>
            <button type="button" className="icon-btn" onClick={replySelected} aria-label="Reply">
              <Reply size={19} aria-hidden="true" />
            </button>
            <button type="button" className="icon-btn" onClick={infoSelected} aria-label="Message info">
              <Info size={19} aria-hidden="true" />
            </button>
            {selectedMessage?.userId === user?.id && (
              <button type="button" className="icon-btn danger" onClick={askDeleteSelected} aria-label="Delete message">
                <Trash2 size={19} aria-hidden="true" />
              </button>
            )}
          </div>
        </header>
      ) : (
        <header className="chat-head">
          <div>
            <h2>Live Chat</h2>
            <span className={`live-dot${live ? ' is-live' : ''}`}>{live ? 'Live' : 'Connecting…'}</span>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close chat">
            <X size={20} aria-hidden="true" />
          </button>
        </header>
      )}

      <div
        className={`chat-list${selectedId ? ' has-selection' : ''}`}
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        onClick={() => selectedId && clearSelection()}
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
          const isSelected = selectedId === m.id;
          const { counts, mine: myReaction } = summarize(reactions, m.id, user?.id);
          return (
            <div
              key={m.id}
              ref={(el) => {
                if (el) bubbleRefs.current.set(m.id, el);
                else bubbleRefs.current.delete(m.id);
              }}
              className={`msg${mine ? ' is-mine' : ''}${mentioned ? ' mentions-me' : ''}${isSelected ? ' is-selected' : ''}${flashId === m.id ? ' is-flash' : ''}`}
              onContextMenu={(e) => openActions(e, m)}
              onTouchStart={() => startLongPress(m)}
              onTouchEnd={cancelLongPress}
              onTouchMove={cancelLongPress}
            >
              <div className="msg-col">
                {isSelected && (
                  <div className="reaction-picker" role="menu" onClick={(e) => e.stopPropagation()}>
                    {REACTION_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className={myReaction === emoji ? 'is-active' : ''}
                        onClick={() => void react(m, emoji)}
                        aria-label={`React ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                <div className="msg-line">
                  {!mine && <Avatar id={m.avatarId} size={30} />}
                  <div className="msg-body">
                    <span className="msg-meta">
                      {mine ? 'You' : m.username} · {time(m.createdAt)}
                    </span>
                    {m.replyToId && (
                      <button
                        type="button"
                        className="msg-quote"
                        onClick={(e) => {
                          e.stopPropagation();
                          jumpTo(m.replyToId!);
                        }}
                      >
                        <CornerUpLeft size={13} aria-hidden="true" />
                        <span className="msg-quote-text">
                          <span className="msg-quote-name">{m.replyUsername ?? 'Deleted message'}</span>
                          <span>{m.replyPreview ?? ''}</span>
                        </span>
                      </button>
                    )}
                    <MessageBody body={m.body} />
                  </div>
                </div>

                {counts.length > 0 && (
                  <div className="msg-reactions">
                    {counts.map(([emoji, n]) => (
                      <button
                        key={emoji}
                        type="button"
                        className={`reaction-pill${myReaction === emoji ? ' is-mine' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          void react(m, emoji);
                        }}
                      >
                        {emoji} {n > 1 ? n : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {replyTo && (
        <div className="reply-preview">
          <span className="reply-preview-bar" aria-hidden="true" />
          <div className="reply-preview-text">
            <span className="reply-preview-name">Replying to {replyTo.userId === user?.id ? 'yourself' : replyTo.username}</span>
            <span className="reply-preview-body">{replyTo.body}</span>
          </div>
          <button type="button" className="icon-btn" onClick={() => setReplyTo(null)} aria-label="Cancel reply">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

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
                    onMouseDown={(e) => e.preventDefault()} // keep focus in the input
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

      <MessageInfoModal message={infoMessage} onClose={() => setInfoMessage(null)} />
      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete this message?"
        description="It will be removed for everyone. This can’t be undone."
        confirmLabel="Delete"
        tone="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </section>
  );
}