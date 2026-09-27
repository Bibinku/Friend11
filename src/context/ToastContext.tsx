import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { ToastKind } from '../types';

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

type ShowToast = (message: string, kind?: ToastKind) => void;

const ToastContext = createContext<ShowToast | undefined>(undefined);

const ICONS = { info: Info, success: CheckCircle2, error: AlertCircle } as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const showToast = useCallback<ShowToast>((message, kind = 'info') => {
    const id = nextId.current++;
    setToasts((prev) => [...prev.slice(-2), { id, message, kind }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), kind === 'error' ? 6000 : 3500);
  }, []);

  const value = useMemo(() => showToast, [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICONS[t.kind];
          return (
            <div key={t.id} className={`toast toast-${t.kind}`}>
              <Icon size={18} aria-hidden="true" />
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
