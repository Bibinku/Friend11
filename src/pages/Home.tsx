import { Link } from 'react-router-dom';
import { ArrowRight, Copy, Filter, PlusCircle, Search, Swords } from 'lucide-react';
import { useRooms } from '../context/RoomsContext';
import { useFilteredRooms, useRoomFilters } from '../context/RoomFiltersContext';
import { ActiveFilters } from '../components/ActiveFilters';
import { RoomList } from '../components/RoomList';

const STEPS = [
  { icon: PlusCircle, title: 'Create a room', text: 'Enter your eFootball room code and pick a mode. No account needed.' },
  { icon: Search, title: 'Find a room', text: 'Browse live rooms or filter by mode, country, player or code.' },
  { icon: Copy, title: 'Copy the code', text: 'Tap Copy Code on any room. Codes are public.' },
  { icon: Swords, title: 'Enter it in eFootball', text: 'Paste the code in the game yourself and play. Rooms last 10 minutes.' },
];

export function Home() {
  const { all: rooms, filtered } = useFilteredRooms();
  const { status } = useRooms();
  const { activeCount, openFilter } = useRoomFilters();

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <h1>
            Find a friendly.
            <br />
            Copy the code. Play.
          </h1>
          <p className="hero-sub">
            Post your eFootball room code for 10 minutes, or grab one from another player and get straight into a match.
          </p>
          <div className="hero-actions">
            <Link to="/create" className="btn btn-primary btn-lg">
              Create Match <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link to="/join" className="btn btn-secondary btn-lg">
              Join Match
            </Link>
          </div>
          <p className="hero-live" aria-live="polite">
            <span className={`live-dot${status === 'ready' ? ' is-live' : ''}`} aria-hidden="true" />
            {status === 'ready' ? `${rooms.length} ${rooms.length === 1 ? 'room' : 'rooms'} live now` : 'Checking live rooms…'}
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Live now</h2>
            <div className="section-head-actions">
              <Link to="/join" className="text-link">
                View all rooms <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <button
                type="button"
                className={`icon-btn filter-btn${activeCount > 0 ? ' is-active' : ''}`}
                onClick={openFilter}
                aria-label={activeCount > 0 ? `Filter rooms (${activeCount} on)` : 'Filter rooms'}
                aria-haspopup="dialog"
              >
                <Filter size={20} aria-hidden="true" />
                {activeCount > 0 && (
                  <span className="filter-badge" aria-hidden="true">
                    {activeCount}
                  </span>
                )}
              </button>
            </div>
          </div>
          <ActiveFilters />
          <RoomList rooms={filtered.slice(0, 3)} filtered={rooms.length > 0} />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>How it works</h2>
          </div>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className="step card">
                <span className="step-num" aria-hidden="true">
                  {i + 1}
                </span>
                <s.icon size={22} aria-hidden="true" />
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}