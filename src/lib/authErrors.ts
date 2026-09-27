/** Turns raw Supabase/Google auth errors into instructions a person can act on. */
export function friendlyAuthError(code: string | null | undefined, description?: string | null): string {
  const text = `${code ?? ''} ${description ?? ''}`.toLowerCase().replace(/\+/g, ' ');
  if (text.includes('otp_expired') || text.includes('expired') || text.includes('invalid or has expired')) {
    return 'That sign-in link has expired or was already used. Request a new one.';
  }
  if (text.includes('access_denied') || text.includes('cancel')) return 'Sign-in was cancelled. You can try again any time.';
  if (text.includes('redirect') && text.includes('mismatch')) {
    return 'Google sign-in isn’t set up for this address yet. The site owner needs to add it in Google Cloud.';
  }
  if (text.includes('rate limit') || text.includes('security purposes') || text.includes('429')) {
    return 'Too many attempts. Wait a minute, then try again.';
  }
  if (text.includes('failed to fetch') || text.includes('network')) return 'Can’t reach the server. Check your connection and try again.';
  if (text.includes('signups not allowed') || text.includes('provider is not enabled')) {
    return 'This sign-in method isn’t enabled for the site yet.';
  }
  const cleaned = (description ?? '').replace(/\+/g, ' ').trim();
  return cleaned || 'Sign-in didn’t complete. Please try again.';
}
