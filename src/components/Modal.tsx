import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** false = no close button / Escape / backdrop dismissal (first-run profile only). */
  dismissable?: boolean;
  size?: 'sm' | 'md';
}

let openCount = 0;

/** Every dialog uses this: bottom sheet on phones, centred card on larger screens. */
export function Modal({ open, onClose, title, description, children, dismissable = true, size = 'sm' }: ModalProps) {
  const ref = useFocusTrap<HTMLDivElement>(open);

  useEffect(() => {
    if (!open || !dismissable) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, dismissable, onClose]);

  useEffect(() => {
    if (!open) return;
    openCount += 1;
    document.body.classList.add('scroll-locked');
    return () => {
      openCount -= 1;
      if (openCount <= 0) document.body.classList.remove('scroll-locked');
    };
  }, [open]);

  if (!open) return null;
  const titleId = `modal-title-${title.replace(/\W+/g, '-').toLowerCase()}`;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (dismissable && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={ref}
        tabIndex={-1}
      >
        {dismissable && (
          <button type="button" className="icon-btn modal-close" onClick={onClose} aria-label="Close">
            <X size={20} aria-hidden="true" />
          </button>
        )}
        <header className="modal-head">
          <h2 id={titleId}>{title}</h2>
          {description && <p>{description}</p>}
        </header>
        {children}
      </div>
    </div>
  );
}
