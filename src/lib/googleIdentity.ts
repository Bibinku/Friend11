/**
 * Google Identity Services (the "ID token" method).
 *
 * Google's script draws its own "Continue with Google" button. When someone
 * picks an account, Google calls us back with a signed ID token, which
 * AuthContext hands to Supabase (`signInWithIdToken`). Nothing here uses a
 * redirect, and nothing here is secret: the Client ID is public by design.
 */

/** The Client ID of the "Web application" OAuth client in Google Cloud. */
export const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '';

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleButtonOptions {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill';
  logo_alignment?: 'left' | 'center';
  width?: number;
}

interface GoogleIdApi {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    nonce?: string;
    auto_select?: boolean;
    itp_support?: boolean;
    ux_mode?: 'popup' | 'redirect';
  }) => void;
  renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdApi } };
  }
}

type CredentialHandler = (credential: string, nonce: string) => void;

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let scriptPromise: Promise<void> | null = null;
let setupPromise: Promise<void> | null = null;
let handler: CredentialHandler | null = null;

/** The component that is currently on screen registers itself here. */
export function setGoogleCredentialHandler(next: CredentialHandler | null): void {
  handler = next;
}

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        script.remove();
        scriptPromise = null; // allow a retry next time
        reject(new Error('The Google sign-in script could not be loaded.'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

const toHex = (bytes: Uint8Array): string => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return toHex(new Uint8Array(digest));
}

/** Runs once per page load. */
function setupGoogle(): Promise<void> {
  if (!setupPromise) {
    setupPromise = (async () => {
      if (!GOOGLE_CLIENT_ID) throw new Error('VITE_GOOGLE_CLIENT_ID is not set.');
      // Google sign-in only works on https:// or http://localhost.
      if (!window.isSecureContext || !window.crypto?.subtle) throw new Error('Google sign-in needs https or localhost.');

      await loadGoogleScript();
      const api = window.google?.accounts?.id;
      if (!api) throw new Error('Google sign-in is unavailable.');

      // Supabase checks that the token carries the SHA-256 of this raw nonce.
      // Google gets the hash; Supabase later gets the raw value.
      const rawNonce = toHex(crypto.getRandomValues(new Uint8Array(32)));
      const hashedNonce = await sha256Hex(rawNonce);

      api.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (response.credential && handler) handler(response.credential, rawNonce);
        },
        nonce: hashedNonce,
        auto_select: false,
        itp_support: true,
        ux_mode: 'popup',
      });
    })().catch((err: unknown) => {
      setupPromise = null; // allow a retry next time
      throw err;
    });
  }
  return setupPromise;
}

/** Draws Google's sign-in button inside `parent`. Rejects if Google can't be set up. */
export async function renderGoogleButton(parent: HTMLElement, width: number): Promise<void> {
  await setupGoogle();
  const api = window.google?.accounts?.id;
  if (!api) throw new Error('Google sign-in is unavailable.');
  parent.replaceChildren();
  api.renderButton(parent, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'rectangular',
    logo_alignment: 'left',
    width,
  });
}