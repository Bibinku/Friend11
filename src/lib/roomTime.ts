import type { MatchRoom } from '../types';

/**
 * Room lifetime is EXACTLY 10 minutes, derived only from the server's
 * `createdAt`. Nothing stores a decrementing counter, so refreshing,
 * copying a code, or backgrounding a tab can never reset or extend it.
 */
export const ROOM_LIFETIME_MS = 10 * 60 * 1000;

type Timed = Pick<MatchRoom, 'createdAt'>;

export const expiresAt = (room: Timed): number => room.createdAt + ROOM_LIFETIME_MS;
export const remainingMs = (room: Timed, now: number): number => Math.max(0, expiresAt(room) - now);
export const isExpired = (room: Timed, now: number): boolean => now >= expiresAt(room);

/** MM:SS. Uses ceil so the display hits 00:00 exactly when the room expires. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
