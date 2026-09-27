import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

/** False when the two Supabase env vars are missing. The app then shows a
 * clear setup screen instead of crashing or failing silently. */
export const isSupabaseConfigured = Boolean(url && key);

/**
 * Captured BEFORE the client is created. supabase-js consumes the auth
 * tokens in the URL (`#access_token=…` or `?code=…`) as soon as it is
 * constructed and then cleans the address bar, so this is the only moment
 * we can tell that this page load is a sign-in callback (or a failed one).
 */
export interface AuthCallbackInfo {
  isCallback: boolean;
  errorCode: string | null;
  errorDescription: string | null;
}

function readCallbackInfo(): AuthCallbackInfo {
  const { hash, search } = window.location;
  const params = new URLSearchParams(search);
  const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
  const get = (k: string) => params.get(k) ?? hashParams.get(k);
  const errorCode = get('error_code') ?? get('error');
  const errorDescription = get('error_description');
  const isCallback = Boolean(get('access_token') || get('code') || errorCode || errorDescription);
  return { isCallback, errorCode, errorDescription };
}

export const initialAuthCallback: AuthCallbackInfo = readCallbackInfo();

/** Remove error params from the address bar so a refresh doesn't re-show them. */
export function stripAuthErrorFromUrl(): void {
  const u = new URL(window.location.href);
  ['error', 'error_code', 'error_description'].forEach((k) => u.searchParams.delete(k));
  if (/error/.test(u.hash)) u.hash = '';
  window.history.replaceState(window.history.state, '', u.pathname + u.search + u.hash);
}

/**
 * Where Google and the email link send the person back to.
 *  - Local dev: whatever origin you're browsing (localhost or LAN address).
 *  - Production: VITE_SITE_URL if set, otherwise the current origin.
 * Nothing here is hardcoded to a development host.
 */
export function getAuthRedirectUrl(): string {
  const configured = import.meta.env.VITE_SITE_URL?.trim().replace(/\/+$/, '');
  if (import.meta.env.DEV || !configured) return window.location.origin;
  return configured;
}

/**
 * The single Supabase client. Options are explicit on purpose:
 *  - detectSessionInUrl: parse the tokens on return from Google / email link.
 *  - persistSession + autoRefreshToken: session survives refreshes and renews.
 *  - flowType 'implicit': a magic link works even when it is opened in a
 *    different browser than the one that requested it (typical when a mail
 *    app opens links in its own in-app browser). PKCE would fail there.
 */
export const supabase = createClient(url ?? 'https://not-configured.invalid', key ?? 'not-configured', {
  auth: {
    flowType: 'implicit',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
});
