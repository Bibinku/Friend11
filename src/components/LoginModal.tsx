import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircle2, Loader2, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { validateEmail } from '../lib/validation';
import { clearAfterLogin } from '../lib/storage';
import { Modal } from './Modal';
import { GoogleIcon } from './GoogleIcon';

const RESEND_SECONDS = 60;

export function LoginModal() {
  const { loginOpen, closeLogin, loginReason } = useUI();
  const { clearCallbackError } = useAuth();

  const close = () => {
    clearCallbackError();
    clearAfterLogin(); // the person backed out: don't resume chat on a later sign-in
    closeLogin();
  };

  return (
    <Modal
      open={loginOpen}
      onClose={close}
      title="Sign in to FRIEND11"
      description={
        loginReason === 'chat'
          ? 'Live Chat is for signed-in players. Sign in to read and send messages.'
          : 'Sign in for Live Chat and your player profile. You don’t need an account to browse or create rooms.'
      }
    >
      <LoginForm />
    </Modal>
  );
}

/** Mounted only while the modal is open, so its state resets on every open. */
function LoginForm() {
  const { signInWithGoogle, sendMagicLink, callbackError, clearCallbackError } = useAuth();
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<'form' | 'sending' | 'sent'>('form');
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(callbackError);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendIn]);

  async function google() {
    setError(null);
    clearCallbackError();
    setGoogleBusy(true);
    const res = await signInWithGoogle();
    if (!res.ok) {
      setGoogleBusy(false);
      setError(res.error ?? 'Google sign-in could not start.');
    }
    // On success the browser is already navigating to Google; keep the spinner.
  }

  async function sendLink(e?: FormEvent) {
    e?.preventDefault();
    const check = validateEmail(email);
    if (!check.ok) {
      setError(check.error ?? 'Enter a valid email address.');
      return;
    }
    setError(null);
    clearCallbackError();
    setPhase('sending');
    const res = await sendMagicLink(email);
    if (!res.ok) {
      setPhase('form');
      setError(res.error ?? 'Couldn’t send the link. Try again.');
      return;
    }
    setPhase('sent');
    setResendIn(RESEND_SECONDS);
  }

  if (phase === 'sent') {
    return (
      <div className="login-sent" role="status">
        <CheckCircle2 size={40} aria-hidden="true" />
        <h3>Check your email</h3>
        <p>
          We sent a sign-in link to <strong>{email.trim().toLowerCase()}</strong>. Tap it on this device to finish signing in. It expires
          soon and works once.
        </p>
        <div className="modal-actions stack">
          <button type="button" className="btn btn-secondary btn-block" onClick={() => void sendLink()} disabled={resendIn > 0}>
            {resendIn > 0 ? `Resend link in ${resendIn}s` : 'Resend link'}
          </button>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => setPhase('form')}>
            Use a different email
          </button>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  const sending = phase === 'sending';
  return (
    <div className="login">
      {error && (
        <p className="form-error banner" role="alert">
          {error}
        </p>
      )}

      <button type="button" className="btn btn-google btn-block" onClick={() => void google()} disabled={googleBusy || sending}>
        {googleBusy ? <Loader2 size={18} className="spin" aria-hidden="true" /> : <GoogleIcon />}
        {googleBusy ? 'Opening Google…' : 'Continue with Google'}
      </button>

      <div className="divider">
        <span>or</span>
      </div>

      <form onSubmit={sendLink} noValidate>
        <label className="label" htmlFor="login-email">
          Email address
        </label>
        <input
          id="login-email"
          className="field"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error != null && phase === 'form' && !googleBusy ? true : undefined}
          disabled={sending}
        />
        <button type="submit" className="btn btn-primary btn-block" disabled={sending || googleBusy}>
          {sending ? <Loader2 size={18} className="spin" aria-hidden="true" /> : <Mail size={18} aria-hidden="true" />}
          {sending ? 'Sending link…' : 'Email me a sign-in link'}
        </button>
      </form>

      <p className="fine">No password needed. New here? You’ll choose a username and avatar right after signing in.</p>
    </div>
  );
}
