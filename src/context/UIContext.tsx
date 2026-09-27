import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { saveAfterLogin } from '../lib/storage';
import { useAuth } from './AuthContext';

export type LoginReason = 'chat' | null;

interface UIValue {
  loginOpen: boolean;
  loginReason: LoginReason;
  openLogin: (reason?: LoginReason) => void;
  closeLogin: () => void;
  chatOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  /** Chat entry point: opens chat for members, otherwise explains + offers login. */
  requestChat: () => void;
}

const UIContext = createContext<UIValue | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const { isMember } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginReason, setLoginReason] = useState<LoginReason>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const openLogin = useCallback((reason: LoginReason = null) => {
    setLoginReason(reason);
    setLoginOpen(true);
  }, []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);
  const openChat = useCallback(() => setChatOpen(true), []);
  const closeChat = useCallback(() => setChatOpen(false), []);

  const requestChat = useCallback(() => {
    if (isMember) {
      setChatOpen(true);
      return;
    }
    saveAfterLogin('chat'); // resume here after Google / email round trip
    openLogin('chat');
  }, [isMember, openLogin]);

  const value = useMemo(
    () => ({ loginOpen, loginReason, openLogin, closeLogin, chatOpen, openChat, closeChat, requestChat }),
    [loginOpen, loginReason, openLogin, closeLogin, chatOpen, openChat, closeChat, requestChat],
  );
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside UIProvider');
  return ctx;
}
