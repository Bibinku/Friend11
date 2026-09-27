import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { AvatarGrid } from './AvatarGrid';
import { avatarFor } from '../data/avatars';

interface AvatarPickerModalProps {
  open: boolean;
  currentId: number;
  onClose: () => void;
  onSave: (id: number) => Promise<boolean>;
}

/** The draft selection lives here and is only saved by Done; closing discards it. */
export function AvatarPickerModal({ open, currentId, onClose, onSave }: AvatarPickerModalProps) {
  return (
    <Modal open={open} onClose={onClose} size="md" title="Change profile picture" description="Pick one avatar, then press Done to save.">
      <Picker currentId={currentId} onClose={onClose} onSave={onSave} />
    </Modal>
  );
}

function Picker({ currentId, onClose, onSave }: Omit<AvatarPickerModalProps, 'open'>) {
  const [draft, setDraft] = useState(currentId);
  const [saving, setSaving] = useState(false);

  async function done() {
    if (draft === currentId) return onClose();
    setSaving(true);
    const ok = await onSave(draft);
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <>
      <AvatarGrid value={draft} onChange={setDraft} />
      <p className="hint avatar-caption" aria-live="polite">
        Selected: {avatarFor(draft).label}
      </p>
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={() => void done()} disabled={saving}>
          {saving && <Loader2 size={16} className="spin" aria-hidden="true" />}
          Done
        </button>
      </div>
    </>
  );
}
