import { useEffect, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID, renderGoogleButton, setGoogleCredentialHandler } from '../lib/googleIdentity';

interface GoogleSignInButtonProps {
  /** Dims and locks the button while a sign-in is being finished. */
  busy: boolean;
  /** Called with Google's signed ID token and the raw nonce Supabase needs. */
  onCredential: (credential: string, nonce: string) => void;
}

/** Google's own "Continue with Google" button, drawn by Google's script. */
export function GoogleSignInButton({ busy, onCredential }: GoogleSignInButtonProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const latest = useRef(onCredential);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(GOOGLE_CLIENT_ID ? 'loading' : 'error');

  useEffect(() => {
    latest.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    setGoogleCredentialHandler((credential, nonce) => latest.current(credential, nonce));
    return () => setGoogleCredentialHandler(null);
  }, []);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot || !GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    const width = Math.max(200, Math.min(400, Math.round(slot.clientWidth) || 320));
    renderGoogleButton(slot, width)
      .then(() => {
        if (!cancelled) setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
      slot.replaceChildren();
    };
  }, []);

  return (
    <div className="google-wrap">
      <div ref={slotRef} className={`google-slot${busy ? ' is-busy' : ''}`} hidden={status !== 'ready'} />
      {status === 'loading' && <div className="google-skeleton" aria-hidden="true" />}
      {status === 'error' && (
        <p className="google-unavailable" role="status">
          Google sign-in isn’t available right now. Use the email link below.
        </p>
      )}
      {busy && (
        <p className="google-busy" role="status">
          Signing you in…
        </p>
      )}
    </div>
  );
}