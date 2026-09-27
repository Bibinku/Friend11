/**
 * Optional: append "Username | Email | Login Time" to a
 * Google Sheet via an Apps Script web app. Disabled unless
 * VITE_GOOGLE_SHEET_API_URL is set. Fire-and-forget: it can never block or
 * break sign-in.
 */
const ENDPOINT = import.meta.env.VITE_GOOGLE_SHEET_API_URL?.trim();

export function logLogin(entry: { username: string; email: string }): void {
  if (!ENDPOINT) return;
  void fetch(ENDPOINT, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...entry, mobile: '', loginTime: new Date().toISOString() }),
  }).catch(() => undefined);
}
