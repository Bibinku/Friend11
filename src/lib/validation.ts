import type { Result } from '../types';
import { COUNTRY_NAMES, MATCH_MODES } from '../types';
import type { CountryName, MatchMode } from '../types';

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const ROOM_CODE_MAX = 20;
export const ROOM_MESSAGE_MAX = 140;
export const CHAT_MESSAGE_MAX = 280;

const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{3,20}$/;
const RESERVED_PATTERN = /^(guest\d*|admin|administrator|moderator|support|friend11|konami|efootball|official)$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateUsername(value: string): Result {
  const v = value.trim();
  if (!v) return { ok: false, error: 'Choose a username.' };
  if (!USERNAME_PATTERN.test(v)) {
    return { ok: false, error: `Use ${USERNAME_MIN}–${USERNAME_MAX} letters, numbers, dots, hyphens or underscores.` };
  }
  if (RESERVED_PATTERN.test(v)) return { ok: false, error: 'That name is reserved. Try another.' };
  return { ok: true };
}

export function validateEmail(value: string): Result {
  const v = value.trim();
  if (!v) return { ok: false, error: 'Enter your email address.' };
  if (!EMAIL_PATTERN.test(v) || v.length > 254) return { ok: false, error: 'Enter a valid email address.' };
  return { ok: true };
}

export function validateRoomCode(value: string): Result {
  const v = value.trim();
  if (!v) return { ok: false, error: 'Enter your eFootball room code.' };
  if (v.length > ROOM_CODE_MAX) return { ok: false, error: `Room codes are up to ${ROOM_CODE_MAX} characters.` };
  return { ok: true };
}

export function validateRoomMessage(value: string): Result {
  if (value.trim().length > ROOM_MESSAGE_MAX) return { ok: false, error: `Keep it under ${ROOM_MESSAGE_MAX} characters.` };
  return { ok: true };
}

export function validateChatMessage(value: string): Result {
  const v = value.trim();
  if (!v) return { ok: false, error: 'Message can’t be empty.' };
  if (v.length > CHAT_MESSAGE_MAX) return { ok: false, error: `Keep it under ${CHAT_MESSAGE_MAX} characters.` };
  return { ok: true };
}

export function isMode(v: unknown): v is MatchMode {
  return typeof v === 'string' && (MATCH_MODES as readonly string[]).includes(v);
}
export function isCountry(v: unknown): v is CountryName {
  return typeof v === 'string' && (COUNTRY_NAMES as readonly string[]).includes(v);
}
