/** Shared domain types. UI never talks to Supabase row shapes directly. */

export const MATCH_MODES = [
  '1v1 Dream Team',
  '1v1 Authentic Team',
  'Co-op Friendly 2V2',
  'Co-op Friendly 3V3',
  'Tournament (4)',
  'Tournament (8)',
] as const;
/** The six creatable modes. "All modes" is a filter value only. */
export type MatchMode = (typeof MATCH_MODES)[number];
export type MatchModeFilter = 'All modes' | MatchMode;

export const COUNTRY_NAMES = [
  'India',
  'Brazil',
  'Argentina',
  'United Kingdom',
  'Germany',
  'United States',
  'Indonesia',
  'Japan',
  'Malaysia',
  'Other',
] as const;
export type CountryName = (typeof COUNTRY_NAMES)[number];

export interface Result {
  ok: boolean;
  error?: string;
}

/** FRIEND11 profile row (id = auth.users.id, immutable). */
export interface Profile {
  id: string;
  username: string;
  avatarId: number;
  /** Null until the person sets one (existing accounts from before this feature). */
  country: CountryName | null;
  onboarded: boolean;
  createdAt: string;
}

export interface MatchRoom {
  id: string;
  username: string;
  avatarId: number;
  /** Null for guest-created rooms, and for members who haven't set a country yet. */
  country: CountryName | null;
  mode: MatchMode;
  code: string;
  message: string;
  /** Server timestamp (ms). The single source of truth for expiry. */
  createdAt: number;
  isMine: boolean;
  /** How many distinct people may use Copy Code before this room is "full". */
  copyLimit: number;
  /** How many of those slots are used so far. */
  copiesUsed: number;
  /** Have I personally used one of this room's copy slots? */
  iCopied: boolean;
  /** True once the room is full AND I'm not the owner or one of the copiers —
   * drives the greyed-out "Already Copied" button and the room sinking down
   * the list. Always false for the owner and for anyone who already copied. */
  fullForMe: boolean;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  avatarId: number;
  body: string;
  createdAt: number;
  /** Set when this message is a reply. replyUsername/replyPreview are a
   * snapshot taken at send time, so the quote still reads correctly even
   * after the original scrolls out of the loaded history. */
  replyToId: string | null;
  replyUsername: string | null;
  replyPreview: string | null;
}

export const REACTION_EMOJIS = ['❤️', '😂', '😢', '😮', '👏', '👍'] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

/** One person's reaction to one message. A person has at most one per message. */
export interface ChatReaction {
  messageId: string;
  userId: string;
  emoji: string;
}

export type ThemeMode = 'light' | 'dark';
export type ToastKind = 'info' | 'success' | 'error';