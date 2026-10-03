import type { MatchRoom, MatchMode, Result } from '../types';
import { supabase } from '../lib/supabase';
import { isCountry, isMode } from '../lib/validation';

interface RoomRow {
  id: string;
  username: string;
  avatar_id: number;
  country: string | null;
  mode: string;
  code: string;
  message: string | null;
  created_at: string;
  server_now: string;
  is_mine: boolean | null;
  copy_limit: number | null;
  copies_used: number | null;
  i_copied: boolean | null;
  full_for_me: boolean | null;
}

export interface RoomSnapshot {
  rooms: MatchRoom[];
  /** serverNow − clientNow (ms). Add to Date.now() for a trustworthy clock. */
  clockOffsetMs: number;
}

/**
 * All live rooms (public — no login needed), already sorted so a room that's
 * full FOR THIS VIEWER sinks to the bottom. `p_guest_key` only lets the
 * server flag which room and which copy slots belong to this browser.
 */
export async function listRooms(guestKey: string): Promise<{ data: RoomSnapshot | null; error: string | null }> {
  const { data, error } = await supabase.rpc('list_rooms', { p_guest_key: guestKey });
  if (error) return { data: null, error: error.message };
  const rows = (Array.isArray(data) ? data : []) as RoomRow[];
  const serverNow = rows[0] ? Date.parse(rows[0].server_now) : NaN;
  const offset = Number.isFinite(serverNow) ? serverNow - Date.now() : 0;

  const rooms: MatchRoom[] = [];
  for (const r of rows) {
    const createdAt = Date.parse(r.created_at);
    // Skip malformed rows instead of crashing the list. Country is allowed
    // to be null (guest rooms, or members who haven't set one).
    if (!isMode(r.mode) || !Number.isFinite(createdAt)) continue;
    rooms.push({
      id: r.id,
      username: r.username,
      avatarId: r.avatar_id,
      country: isCountry(r.country) ? r.country : null,
      mode: r.mode,
      code: r.code,
      message: r.message ?? '',
      createdAt,
      isMine: Boolean(r.is_mine),
      copyLimit: r.copy_limit ?? 1,
      copiesUsed: r.copies_used ?? 0,
      iCopied: Boolean(r.i_copied),
      fullForMe: Boolean(r.full_for_me),
    });
  }
  return { data: { rooms, clockOffsetMs: offset }, error: null };
}

export interface CreateRoomInput {
  code: string;
  mode: MatchMode;
  message: string;
  guestKey: string;
  guestUsername: string;
}

/** Creates a room, replacing any room this person already has. The server
 * stamps `created_at`, starts the 10-minute clock, and fills in the
 * country from the signed-in person's profile (or leaves it empty for a
 * guest). */
export async function createRoom(input: CreateRoomInput): Promise<Result> {
  const { error } = await supabase.rpc('create_room', {
    p_code: input.code.trim(),
    p_mode: input.mode,
    p_message: input.message.trim(),
    p_guest_key: input.guestKey,
    p_guest_username: input.guestUsername,
  });
  if (error) return { ok: false, error: 'Couldn’t publish your room. Check your connection and try again.' };
  return { ok: true };
}

export async function deleteMyRoom(guestKey: string): Promise<Result> {
  const { error } = await supabase.rpc('delete_my_room', { p_guest_key: guestKey });
  if (error) return { ok: false, error: 'Couldn’t delete your room. Try again.' };
  return { ok: true };
}

export interface CopyResult extends Result {
  /** The code to put on the clipboard — present whenever ok is true. */
  code?: string;
  /** True when the room's copy slots filled up moments before this tap. */
  roomFull?: boolean;
}

/**
 * Records a Copy Code tap and returns the code to copy. Copying your own
 * room is always free. Otherwise this uses one of the room's limited slots
 * (one per person, ever) and is subject to the site-wide 3-minute cooldown
 * between copies, enforced by the server.
 */
export async function copyRoomCode(roomId: string, guestKey: string): Promise<CopyResult> {
  const { data, error } = await supabase.rpc('copy_room_code', { p_room_id: roomId, p_guest_key: guestKey });
  if (error) {
    const msg = error.message ?? '';
    if (/expired/i.test(msg)) return { ok: false, error: 'This room has expired.' };
    if (/wait a few minutes/i.test(msg)) {
      return { ok: false, error: 'You copied a code recently. Please wait a few minutes before copying another.' };
    }
    return { ok: false, error: 'Couldn’t copy this code. Try again.' };
  }
  const row = (Array.isArray(data) ? data[0] : data) as { code: string; room_full: boolean } | undefined;
  if (!row) return { ok: false, error: 'Couldn’t copy this code. Try again.' };
  return { ok: true, code: row.code, roomFull: row.room_full };
}