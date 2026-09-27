/** Shared domain types. UI never talks to Supabase row shapes directly. */

export const MATCH_MODES = [
  '1v1 Dream Team',
  '1v1 Authentic Team',
  'Co-op Friendly',
  'Tournament (4)',
  'Tournament (8)',
] as const;
/** The five creatable modes. "All modes" is a filter value only. */
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
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  avatarId: number;
  body: string;
  createdAt: number;
}

export type ThemeMode = 'light' | 'dark';
export type ToastKind = 'info' | 'success' | 'error';