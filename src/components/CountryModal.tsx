import { useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import type { CountryName, Result } from '../types';
import { COUNTRIES } from '../data/countries';
import { Modal } from './Modal';

interface CountryModalProps {
  open: boolean;
  current: CountryName | null;
  onClose: () => void;
  onSave: (country: CountryName) => Promise<Result>;
}

export function CountryModal({ open, current, onClose, onSave }: CountryModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Change country" description="Shown on your room card whenever you host a match.">
      <CountryForm current={current} onClose={onClose} onSave={onSave} />
    </Modal>
  );
}

function CountryForm({ current, onClose, onSave }: Omit<CountryModalProps, 'open'>) {
  const [value, setValue] = useState<CountryName>(current ?? COUNTRIES[0].name);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (value === current) return onClose();
    setSaving(true);
    const res = await onSave(value);
    setSaving(false);
    if (res.ok) onClose();
    else setError(res.error ?? 'Couldn’t update your country.');
  }

  return (
    <form onSubmit={submit} noValidate>
      <label className="label" htmlFor="change-country">
        Country
      </label>
      <select id="change-country" className="field" value={value} onChange={(e) => setValue(e.target.value as CountryName)}>
        {COUNTRIES.map((c) => (
          <option key={c.name} value={c.name}>
            {c.flag} {c.name}
          </option>
        ))}
      </select>
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