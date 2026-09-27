import type { Profile, Result } from '../types';
import { supabase } from '../lib/supabase';

interface ProfileRow {
  id: string;
  username: string;
  avatar_id: number;
  onboarded: boolean;
  created_at: string;
}

const COLUMNS = 'id, username, avatar_id, onboarded, created_at';

const toProfile = (r: ProfileRow): Profile => ({
  id: r.id,
  username: r.username,
  avatarId: r.avatar_id,
  onboarded: r.onboarded,
  createdAt: r.created_at,
});

/** Loads the signed-in user's profile row (RLS: own row only). */
export async function fetchProfile(userId: string): Promise<{ profile: Profile | null; error: string | null }> {
  const { data, error } = await supabase.from('profiles').select(COLUMNS).eq('id', userId).maybeSingle();
  if (error) return { profile: null, error: error.message };
  return { profile: data ? toProfile(data as ProfileRow) : null, error: null };
}

/**
 * Safety net for accounts that exist without a profile row (e.g. created
 * before the database trigger was installed). The placeholder username is
 * never shown — onboarding is required before the profile is usable.
 */
export async function createMissingProfile(userId: string): Promise<{ profile: Profile | null; error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .insert({ id: userId, username: `player_${userId.replace(/-/g, '').slice(0, 8)}`, avatar_id: 1, onboarded: false });
  // 23505 = the trigger created it first; that's fine, just read it back.
  if (error && error.code !== '23505') return { profile: null, error: error.message };
  return fetchProfile(userId);
}

export async function saveProfile(
  userId: string,
  changes: { username?: string; avatarId?: number; onboarded?: boolean },
): Promise<Result> {
  const patch: Record<string, unknown> = {};
  if (changes.username !== undefined) patch.username = changes.username.trim();
  if (changes.avatarId !== undefined) patch.avatar_id = changes.avatarId;
  if (changes.onboarded !== undefined) patch.onboarded = changes.onboarded;

  const { data, error } = await supabase.from('profiles').update(patch).eq('id', userId).select('id');
  if (error) {
    // 23505 = unique_violation on lower(username): case-insensitive uniqueness.
    if (error.code === '23505') return { ok: false, error: 'That username is already taken.' };
    if (error.code === '23514') return { ok: false, error: 'That username isn’t allowed. Try another.' };
    return { ok: false, error: 'Couldn’t save your profile. Check your connection and try again.' };
  }
  if (!data || data.length === 0) return { ok: false, error: 'Couldn’t save your profile. Sign in again and retry.' };
  return { ok: true };
}

/**
 * Permanent deletion runs in an Edge Function because removing an auth user
 * needs a privileged key that must never reach the browser. Rooms, chat
 * messages and the profile are removed by ON DELETE CASCADE.
 */
export async function deleteAccountOnServer(): Promise<Result> {
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) return { ok: false, error: 'Couldn’t delete your account. Try again in a moment.' };
  return { ok: true };
}
