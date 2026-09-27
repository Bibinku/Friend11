import { useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { USERNAME_MAX, validateUsername } from '../lib/validation';
import type { Result } from '../types';

interface UsernameModalProps {
  open: boolean;
  current: string;
  onClose: () => void;
  onSave: (username: string) => Promise<Result>;
}

export function UsernameModal({ open, current, onClose, onSave }: UsernameModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Change username" description="Usernames are unique and not case-sensitive.">
      <UsernameForm current={current} onClose={onClose} onSave={onSave} />
    </Modal>
  );
}

function UsernameForm({ current, onClose, onSave }: Omit<UsernameModalProps, 'open'>) {
  const [value, setValue] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const check = validateUsername(value);
    if (!check.ok) return setError(check.error ?? 'Choose a username.');
    if (value.trim() === current) return onClose();
    setSaving(true);
    const res = await onSave(value);
    setSaving(false);
    if (res.ok) onClose();
    else setError(res.error ?? 'Couldn’t update your username.');
  }

  return (
    <form onSubmit={submit} noValidate>
      <label className="label" htmlFor="change-username">
        New username
      </label>
      <input
        id="change-username"
        className="field"
        value={value}
        maxLength={USERNAME_MAX}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        aria-invalid={error ? true : undefined}
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving && <Loader2 size={16} className="spin" aria-hidden="true" />}
          Save
        </button>
      </div>
    </form>
  );
}
