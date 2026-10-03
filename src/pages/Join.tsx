import { useRoomFilters, useFilteredRooms } from '../context/RoomFiltersContext';
import { RoomFilters } from '../components/RoomFilters';
import { RoomList } from '../components/RoomList';

export function Join() {
  const { all: rooms, filtered } = useFilteredRooms();
  const f = useRoomFilters();

  return (
    <section className="section page">
      <div className="container">
        <div className="page-head">
          <h1>Join a match</h1>
          <p>
            {rooms.length} {rooms.length === 1 ? 'room is' : 'rooms are'} live. Copy a code and enter it in eFootball.
          </p>
        </div>
        <RoomFilters search={f.search} onSearch={f.setSearch} mode={f.mode} onMode={f.setMode} country={f.country} onCountry={f.setCountry} />
        <RoomList rooms={filtered} filtered={rooms.length > 0} />
      </div>
    </section>
  );
}