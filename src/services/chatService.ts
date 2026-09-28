import type { ChatMessage, ChatReaction, Result } from '../types';
import { supabase } from '../lib/supabase';
import { validateChatMessage } from '../lib/validation';

interface ChatRow {
  id: string;
  user_id: string;
  username: string;
  avatar_id: number;
  body: string;
  created_at: string;
}

const COLUMNS = 'id, user_id, username, avatar_id, body, created_at';
const HISTORY = 100;

const toMessage = (r: ChatRow): ChatMessage => ({
  id: r.id,
  userId: r.user_id,
  username: r.username,
  avatarId: r.avatar_id,
  body: r.body,
  createdAt: Date.parse(r.created_at),
});

/** Newest 100 messages, oldest first. RLS: signed-in members only. */
export async function fetchRecentMessages(): Promise<{ data: ChatMessage[]; error: string | null }> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select(COLUMNS)
    .order('created_at', { ascending: false })
    .limit(HISTORY);
  if (error) return { data: [], error: error.message };
  return { data: (data as ChatRow[]).map(toMessage).reverse(), error: null };
}

export async function sendChatMessage(body: string): Promise<Result> {
  const check = validateChatMessage(body);
  if (!check.ok) return check;
  // user_id, username and avatar are stamped by the database from the
  // signed-in profile — the client can't spoof another person.
  const { error } = await supabase.from('chat_messages').insert({ body: body.trim().replace(/\s+/g, ' ') });
  if (error) return { ok: false, error: 'Message didn’t send. Try again.' };
  return { ok: true };
}

/** Live delivery of new messages, and removal of deleted ones. */
export function subscribeToMessages(
  onMessage: (m: ChatMessage) => void,
  onStatus: (live: boolean) => void,
  onDelete?: (id: string) => void,
): () => void {
  const channel = supabase
    .channel('friend11-live-chat')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
      onMessage(toMessage(payload.new as ChatRow));
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages' }, (payload) => {
      const old = payload.old as Partial<ChatRow>;
      if (old.id) onDelete?.(old.id);
    })
    .subscribe((status) => onStatus(status === 'SUBSCRIBED'));
  return () => {
    void supabase.removeChannel(channel);
  };
}

/** Deletes one of my own messages (the server checks ownership). Removes it
 * for everyone; their chat updates live via the DELETE subscription above. */
export async function deleteChatMessage(id: string): Promise<Result> {
  const { error } = await supabase.from('chat_messages').delete().eq('id', id);
  if (error) return { ok: false, error: 'Couldn’t delete the message.' };
  return { ok: true };
}

// ── @mentions ─────────────────────────────────────────────────────────
// A row is created (server-side, from the message text) in chat_mentions for
// every real username someone @mentions. RLS only ever lets a person see
// their own rows, so this count is always just "mentions of me".

/** How many of this person's @mentions haven't been opened in Live Chat yet. */
export async function fetchUnreadMentionCount(): Promise<number> {
  const { count, error } = await supabase.from('chat_mentions').select('id', { count: 'exact', head: true }).is('read_at', null);
  if (error) return 0;
  return count ?? 0;
}

/** Marks every unread mention as read — called when Live Chat is opened. */
export async function markMentionsRead(): Promise<void> {
  await supabase.from('chat_mentions').update({ read_at: new Date().toISOString() }).is('read_at', null);
}

/** Fires `onMention` the moment a new @mention of this person is created. */
export function subscribeToMentions(userId: string, onMention: () => void): () => void {
  const channel = supabase
    .channel(`friend11-mentions-${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_mentions', filter: `mentioned_user_id=eq.${userId}` }, () => onMention())
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

// ── Reactions ─────────────────────────────────────────────────────────
// One row per (message, person) in chat_reactions. A person has at most one
// reaction per message; picking a new emoji replaces it, and passing null
// removes it. All writes go through the set_message_reaction() function so
// the emoji is validated and the person is stamped server-side.

interface ReactionRow {
  message_id: string;
  user_id: string;
  emoji: string;
}

const toReaction = (r: ReactionRow): ChatReaction => ({ messageId: r.message_id, userId: r.user_id, emoji: r.emoji });

/** All reactions on the given messages. Call again whenever the visible set of messages changes. */
export async function fetchReactions(messageIds: string[]): Promise<{ data: ChatReaction[]; error: string | null }> {
  if (messageIds.length === 0) return { data: [], error: null };
  const { data, error } = await supabase.from('chat_reactions').select('message_id, user_id, emoji').in('message_id', messageIds);
  if (error) return { data: [], error: error.message };
  return { data: (data as ReactionRow[]).map(toReaction), error: null };
}

/** Sets (or, with `emoji: null`, removes) my reaction on a message. */
export async function setMessageReaction(messageId: string, emoji: string | null): Promise<Result> {
  const { error } = await supabase.rpc('set_message_reaction', { p_message_id: messageId, p_emoji: emoji });
  if (error) return { ok: false, error: 'Couldn’t save your reaction.' };
  return { ok: true };
}

/** Fires on any reaction added, changed, or removed by anyone. */
export function subscribeToReactions(onChange: () => void): () => void {
  const channel = supabase
    .channel('friend11-chat-reactions')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_reactions' }, () => onChange())
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}