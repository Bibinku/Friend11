/**
 * The only module that touches localStorage. Every read is validated, so
 * malformed or stale data can never crash a render — it just falls back.
 * Auth sessions are NOT stored here; Supabase owns those.
 */
import type { ThemeMode } from '../types';

const KEYS = {
  theme: 'friend11_theme_v1',
  guest: 'friend11_guest_v1',
  afterLogin: 'friend11_after_login_v1',
  signInStarted: 'friend11_signin_started_v1',
  lastCopyAt: 'friend11_last_copy_at_v1',
} as const;

function read(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode / quota): degrade to in-memory */
  }
}

function remove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

// ── Theme ─────────────────────────────────────────────────────────────
export function loadTheme(): ThemeMode {
  const v = read(KEYS.theme);
  return v === 'light' || v === 'dark' ? v : 'dark';
}
export function saveTheme(theme: ThemeMode): void {
  write(KEYS.theme, theme);
}

// ── Guest identity (for people creating rooms without an account) ─────
export interface GuestIdentity {
  /** Random secret used to prove ownership of a guest's own room. */
  key: string;
  username: string;
}

const GUEST_NAME = /^Guest[0-9]{4}$/;

function randomKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function loadGuest(): GuestIdentity {
  const v = read(KEYS.guest);
  if (isRecord(v) && typeof v.key === 'string' && v.key.length >= 16 && typeof v.username === 'string' && GUEST_NAME.test(v.username)) {
    return { key: v.key, username: v.username };
  }
  const created: GuestIdentity = { key: randomKey(), username: `Guest${Math.floor(1000 + Math.random() * 9000)}` };
  write(KEYS.guest, created);
  return created;
}

// ── "Where to go after sign-in" (survives the Google/email round trip) ─
export type AfterLoginIntent = 'chat';
const INTENT_TTL_MS = 30 * 60 * 1000;

export function saveAfterLogin(intent: AfterLoginIntent): void {
  write(KEYS.afterLogin, { intent, at: Date.now() });
}
export function clearAfterLogin(): void {
  remove(KEYS.afterLogin);
}
export function takeAfterLogin(): AfterLoginIntent | null {
  const v = read(KEYS.afterLogin);
  remove(KEYS.afterLogin);
  if (isRecord(v) && v.intent === 'chat' && typeof v.at === 'number' && Date.now() - v.at < INTENT_TTL_MS) return 'chat';
  return null;
}

// ── "Google sign-in was started in this browser" (to explain silent failures) ─
const STARTED_TTL_MS = 10 * 60 * 1000;

export function markSignInStarted(): void {
  write(KEYS.signInStarted, Date.now());
}
/** True once, on the first page load after a sign-in was started. */
export function takeSignInStarted(): boolean {
  const v = read(KEYS.signInStarted);
  remove(KEYS.signInStarted);
  return typeof v === 'number' && Date.now() - v < STARTED_TTL_MS;
}
// ── Copy-code cooldown (3 minutes between copies, across ALL rooms) ────
// The server enforces this for real; this is just so the button can show a
// live countdown immediately instead of waiting for a rejected request.
export const COPY_COOLDOWN_MS = 3 * 60 * 1000;

export function markCopyNow(): void {
  write(KEYS.lastCopyAt, Date.now());
}
export function lastCopyAt(): number | null {
  const v = read(KEYS.lastCopyAt);
  return typeof v === 'number' ? v : null;
}