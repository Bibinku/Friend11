import { useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { validateUsername, USERNAME_MAX, isCountry } from '../lib/validation';
import { avatarFor } from '../data/avatars';
import { COUNTRIES } from '../data/countries';
import type { CountryName } from '../types';
import { Modal } from './Modal';
import { AvatarGrid } from './AvatarGrid';

/**
 * First-time profile setup. Opens automatically after Google OR email
 * sign-in when the profile isn't complete. It cannot be dismissed into a
 * half-finished account: the only ways out are Continue (saves everything)
 * or "Sign out" (ends the session; nothing is saved, and it reopens on the
 * next sign-in). The Google name is never used as the username.
 */
export function OnboardingModal() {
  const { needsOnboarding } = useAuth();
  return (
    <Modal
      open={needsOnboarding}
      onClose={() => undefined}
      dismissable={false}
      size="md"
      title="Complete your profile"
      description="Choose a unique username, one avatar and your country. This is how other players will see you."
    >
      <OnboardingForm />
    </Modal>
  );
}

function OnboardingForm() {
  const { completeOnboarding, signOut } = useAuth();
  const [username, setUsername] = useState('');
  const [avatarId, setAvatarId] = useState<number | null>(null);
  const [country, setCountry] = useState<CountryName | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const usernameCheck = validateUsername(username);
  const canSubmit = usernameCheck.ok && avatarId !== null && isCountry(country) && !saving;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!usernameCheck.ok) return setError(usernameCheck.error ?? 'Choose a username.');
    if (avatarId === null) return setError('Pick an avatar to continue.');
    if (!isCountry(country)) return setError('Pick your country to continue.');
    setError(null);
    setSaving(true);
    const res = await completeOnboarding(username, avatarId, country);
    if (!res.ok) {
      setSaving(false);
      setError(res.error ?? 'Couldn’t save your profile.');
    }
    // On success the modal closes itself (needsOnboarding becomes false).
  }

  return (
    <form onSubmit={submit} noValidate>
      <label className="label" htmlFor="onb-username">
        Username
      </label>
      <input
        id="onb-username"
        className="field"
        value={username}
        maxLength={USERNAME_MAX}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="e.g. GoalHunter"
        onChange={(e) => {
          setUsername(e.target.value);
          setError(null);
        }}
        aria-describedby="onb-username-hint"
        aria-invalid={error != null && !usernameCheck.ok ? true : undefined}
      />
      <p id="onb-username-hint" className="hint">
        3–{USERNAME_MAX} characters. Letters, numbers, dots, hyphens, underscores. Must be unique.
      </p>

      <label className="label" htmlFor="onb-country">
        Country
      </label>
      <select
        id="onb-country"
        className="field"
        value={country}
        onChange={(e) => {
          setCountry(e.target.value as CountryName);
          setError(null);
        }}
      >
        <option value="" disabled>
          Select your country…
        </option>
        {COUNTRIES.map((c) => (
          <option key={c.name} value={c.name}>
            {c.flag} {c.name}
          </option>
        ))}
      </select>

      <p className="label">Avatar</p>
      <AvatarGrid value={avatarId} onChange={(id) => { setAvatarId(id); setError(null); }} />
      <p className="hint avatar-caption" aria-live="polite">
        {avatarId ? `Selected: ${avatarFor(avatarId).label}` : 'Tap an avatar to select it.'}
      </p>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="modal-actions stack">
        <button type="submit" className="btn btn-primary btn-block" disabled={!canSubmit}>
          {saving && <Loader2 size={18} className="spin" aria-hidden="true" />}
          Continue
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={() => void signOut()} disabled={saving}>
          Cancel and sign out
        </button>
      </div>
    </form>
  );
}