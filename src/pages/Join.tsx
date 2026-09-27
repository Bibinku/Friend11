import { useMemo, useState } from 'react';
import type { CountryName, MatchModeFilter } from '../types';
import { useActiveRooms } from '../context/RoomsContext';
import { RoomFilters } from '../components/RoomFilters';
import { RoomList } from '../components/RoomList';

export function Join() {
  const rooms = useActiveRooms();
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<MatchModeFilter>('All modes');
  const [country, setCountry] = useState<CountryName | ''>('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rooms.filter(
      (r) =>
        (mode === 'All modes' || r.mode === mode) &&
        (!country || r.country === country) &&
        (!q || r.username.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)),
    );
  }, [rooms, search, mode, country]);

  return (
    <section className="section page">
      <div className="container">
        <div className="page-head">
          <h1>Join a match</h1>
          <p>
            {rooms.length} {rooms.length === 1 ? 'room is' : 'rooms are'} live. Copy a code and enter it in eFootball.
          </p>
        </div>
        <RoomFilters search={search} onSearch={setSearch} mode={mode} onMode={setMode} country={country} onCountry={setCountry} />
        <RoomList rooms={filtered} filtered={rooms.length > 0} />
      </div>
    </section>
  );
}
