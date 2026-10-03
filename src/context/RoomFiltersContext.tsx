import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { CountryName, MatchModeFilter, MatchRoom } from '../types';
import { useActiveRooms } from './RoomsContext';

interface RoomFiltersValue {
  search: string;
  mode: MatchModeFilter;
  country: CountryName | '';
  setSearch: (v: string) => void;
  setMode: (v: MatchModeFilter) => void;
  setCountry: (v: CountryName | '') => void;
  /** How many filters are switched on right now (0–3). */
  activeCount: number;
  clear: () => void;
  /** The filter pop-up opened by the filter icon on the Home page. */
  filterOpen: boolean;
  openFilter: () => void;
  closeFilter: () => void;
}

const RoomFiltersContext = createContext<RoomFiltersValue | undefined>(undefined);

/**
 * One set of filters for the whole site, so choosing "Tournament (4)" in the
 * menu, in the Home pop-up, or on the Join page all mean the same thing.
 */
export function RoomFiltersProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<MatchModeFilter>('All modes');
  const [country, setCountry] = useState<CountryName | ''>('');
  const [filterOpen, setFilterOpen] = useState(false);

  const activeCount = (search.trim() ? 1 : 0) + (mode !== 'All modes' ? 1 : 0) + (country ? 1 : 0);

  const clear = useCallback(() => {
    setSearch('');
    setMode('All modes');
    setCountry('');
  }, []);
  const openFilter = useCallback(() => setFilterOpen(true), []);
  const closeFilter = useCallback(() => setFilterOpen(false), []);

  const value = useMemo<RoomFiltersValue>(
    () => ({ search, mode, country, setSearch, setMode, setCountry, activeCount, clear, filterOpen, openFilter, closeFilter }),
    [search, mode, country, activeCount, clear, filterOpen, openFilter, closeFilter],
  );
  return <RoomFiltersContext.Provider value={value}>{children}</RoomFiltersContext.Provider>;
}

export function useRoomFilters(): RoomFiltersValue {
  const ctx = useContext(RoomFiltersContext);
  if (!ctx) throw new Error('useRoomFilters must be used inside RoomFiltersProvider');
  return ctx;
}

/** Every live room, and the ones that pass the current filters. */
export function useFilteredRooms(): { all: readonly MatchRoom[]; filtered: readonly MatchRoom[] } {
  const all = useActiveRooms();
  const { search, mode, country } = useRoomFilters();
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter(
      (r) =>
        (mode === 'All modes' || r.mode === mode) &&
        (!country || r.country === country) &&
        (!q || r.username.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)),
    );
  }, [all, search, mode, country]);
  return { all, filtered };
}