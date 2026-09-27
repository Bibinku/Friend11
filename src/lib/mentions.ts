/**
 * Detects "@handle" mentions in chat text.
 *
 * A handle only counts when it starts at the beginning of the message or
 * right after a space/punctuation character — this stops something like
 * "ask me@example.com" from being read as a mention of "example.com".
 */
const MENTION_RE = /(^|[^A-Za-z0-9_.@-])@([A-Za-z0-9_.-]{3,20})/g;

export interface MentionSegment {
  text: string;
  isMention: boolean;
}

/** Splits a message into plain-text and @mention pieces, in order, for rendering. */
export function splitMentions(body: string): MentionSegment[] {
  const segments: MentionSegment[] = [];
  let last = 0;
  for (const m of body.matchAll(MENTION_RE)) {
    const start = (m.index ?? 0) + m[1].length;
    const end = start + 1 + m[2].length; // '@' + handle
    if (start > last) segments.push({ text: body.slice(last, start), isMention: false });
    segments.push({ text: body.slice(start, end), isMention: true });
    last = end;
  }
  if (last < body.length) segments.push({ text: body.slice(last), isMention: false });
  return segments.length ? segments : [{ text: body, isMention: false }];
}

/** True if `username` is @mentioned in `body` (case-insensitive). */
export function mentionsUser(body: string, username: string | undefined | null): boolean {
  if (!username) return false;
  const target = username.toLowerCase();
  return Array.from(body.matchAll(MENTION_RE)).some((m) => m[2].toLowerCase() === target);
}

/**
 * If the text just before the caret looks like an in-progress mention
 * ("@" or "@par"), returns the partial handle typed so far (possibly empty).
 * Otherwise returns null.
 */
export function activeMentionQuery(value: string, caret: number): string | null {
  const upToCaret = value.slice(0, caret);
  const m = /(?:^|\s)@([A-Za-z0-9_.-]{0,20})$/.exec(upToCaret);
  return m ? m[1] : null;
}

/** Replaces the in-progress "@partial" ending at the caret with "@username ". */
export function applyMention(value: string, caret: number, username: string): { text: string; caret: number } {
  const upToCaret = value.slice(0, caret);
  const start = upToCaret.search(/@[A-Za-z0-9_.-]*$/);
  if (start === -1) return { text: value, caret };
  const insert = `@${username} `;
  const text = value.slice(0, start) + insert + value.slice(caret);
  return { text, caret: start + insert.length };
}