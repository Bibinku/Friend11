import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { CountryName, MatchMode, MatchRoom, Result } from '../types';
import { isExpired } from '../lib/roomTime';
import { loadGuest } from '../lib/storage';
import type { GuestIdentity } from '../lib/storage';
import * as roomService from '../services/roomService';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const POLL_MS = 10_000;
const TICK_MS = 250;

type LoadStatus = 'loading' | 'ready' | 'error';

interface RoomsValue {
  /** As fetched. Use `useActiveRooms()` for the live, expiry-filtered list. */
  rooms: readonly MatchRoom[];
  status: LoadStatus;
  guest: GuestIdentity;
  refresh: () => Promise<void>;
  createRoom: (input: { code: string; mode: MatchMode; country: CountryName; message: string }) => Promise<Result>;
  deleteMyRoom: () => Promise<Result>;
}

const RoomsContext = createContext<RoomsValue | undefined>(undefined);
/** Server-corrected "now" (ms), ticking a few times a second. */
const ClockContext = createContext<number>(Date.now());

function Clock({ offsetMs, children }: { offsetMs: number; children: ReactNode }) {
  const [now, setNow] = useState(() => Date.now() + offsetMs);
  useEffect(() => {
    const tick = () => setNow(Date.now() + offsetMs);
    tick();
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, [offsetMs]);
  return <ClockContext.Provider value={now}>{children}</ClockContext.Provider>;
}

export function RoomsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const showToast = useToast();
  const [guest] = useState<GuestIdentity>(loadGuest);
  const [rooms, setRooms] = useState<readonly MatchRoom[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [offsetMs, setOffsetMs] = useState(0);
  const errorShown = useRef(false);

  const refresh = useCallback(async () => {
    const { data, error } = await roomService.listRooms(guest.key);
    if (error || !data) {
      setStatus((s) => (s === 'ready' ? s : 'error'));
      if (!errorShown.current) {
        errorShown.current = true;
        showToast('Couldn’t refresh rooms. Retrying…', 'error');
      }
      return;
    }
    errorShown.current = false;
    setRooms(data.rooms);
    setOffsetMs(data.clockOffsetMs);
    setStatus('ready');
  }, [guest.key, showToast]);

  // Fetch on mount and whenever the account changes; poll while visible.
  const userId = user?.id ?? null;
  useEffect(() => {
    void refresh();
    const poll = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh, userId]);

  const createRoom = useCallback<RoomsValue['createRoom']>(
    async (input) => {
      const res = await roomService.createRoom({ ...input, guestKey: guest.key, guestUsername: guest.username });
      if (res.ok) await refresh();
      return res;
    },
    [guest, refresh],
  );

  const deleteMyRoom = useCallback(async () => {
    const res = await roomService.deleteMyRoom(guest.key);
    if (res.ok) {
      setRooms((prev) => prev.filter((r) => !r.isMine)); // disappears immediately
      await refresh();
    }
    return res;
  }, [guest.key, refresh]);

  const value = useMemo<RoomsValue>(
    () => ({ rooms, status, guest, refresh, createRoom, deleteMyRoom }),
    [rooms, status, guest, refresh, createRoom, deleteMyRoom],
  );

  return (
    <RoomsContext.Provider value={value}>
      <Clock offsetMs={offsetMs}>{children}</Clock>
    </RoomsContext.Provider>
  );
}

export function useRooms(): RoomsValue {
  const ctx = useContext(RoomsContext);
  if (!ctx) throw new Error('useRooms must be used inside RoomsProvider');
  return ctx;
}

export const useClock = (): number => useContext(ClockContext);

/** Rooms that are still inside their 10 minutes, right now. Reference-stable
 * between ticks unless a room actually expires, so lists don't re-render 4×/s. */
export function useActiveRooms(): readonly MatchRoom[] {
  const { rooms } = useRooms();
  const now = useClock();
  const last = useRef<readonly MatchRoom[]>([]);
  const active = rooms.filter((r) => !isExpired(r, now));
  const same = active.length === last.current.length && active.every((r, i) => r === last.current[i]);
  if (!same) last.current = active;
  return last.current;
}

/** The current visitor's own active room (account or guest), if any. */
export function useMyRoom(): MatchRoom | undefined {
  return useActiveRooms().find((r) => r.isMine);
}
