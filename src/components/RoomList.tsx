import { Link } from 'react-router-dom';
import { Loader2, PlusCircle } from 'lucide-react';
import type { MatchRoom } from '../types';
import { useRooms } from '../context/RoomsContext';
import { RoomCard } from './RoomCard';

interface RoomListProps {
  rooms: readonly MatchRoom[];
  /** Shown when there are no rooms at all (vs. none matching filters). */
  filtered?: boolean;
}

export function RoomList({ rooms, filtered = false }: RoomListProps) {
  const { status, refresh } = useRooms();

  if (status === 'loading') {
    return (
      <p className="empty" role="status">
        <Loader2 size={20} className="spin" aria-hidden="true" /> Loading rooms…
      </p>
    );
  }
  if (status === 'error') {
    return (
      <div className="empty">
        <p>Couldn’t load rooms right now.</p>
        <button type="button" className="btn btn-secondary" onClick={() => void refresh()}>
          Try again
        </button>
      </div>
    );
  }
  if (rooms.length === 0) {
    return (
      <div className="empty">
        <p>{filtered ? 'No rooms match your search.' : 'No rooms are live right now.'}</p>
        {!filtered && (
          <Link to="/create" className="btn btn-primary">
            <PlusCircle size={18} aria-hidden="true" /> Create the first room
          </Link>
        )}
      </div>
    );
  }
  return (
    <div className="room-grid">
      {rooms.map((r) => (
        <RoomCard key={r.id} room={r} />
      ))}
    </div>
  );
}
