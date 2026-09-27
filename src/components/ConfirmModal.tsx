import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmModal({ open, title, description, confirmLabel, tone = 'primary', onConfirm, onCancel }: ConfirmModalProps) {
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={busy ? () => undefined : onCancel} title={title} description={description}>
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="button" className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`} onClick={confirm} disabled={busy}>
          {busy && <Loader2 size={16} className="spin" aria-hidden="true" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
