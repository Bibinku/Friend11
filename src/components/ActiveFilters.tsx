import { flagFor } from '../data/countries';
import { useRoomFilters } from '../context/RoomFiltersContext';

/** A one-line reminder of which filters are on, with a Clear button. Hidden when none are. */
export function ActiveFilters() {
  const { search, mode, country, activeCount, clear } = useRoomFilters();
  if (activeCount === 0) return null;
  return (
    <div className="filters-active" role="status">
      <span>Filtered by</span>
      {mode !== 'All modes' && <span className="filter-chip">{mode}</span>}
      {country && (
        <span className="filter-chip">
          {flagFor(country)} {country}
        </span>
      )}
      {search.trim() && <span className="filter-chip">“{search.trim()}”</span>}
      <button type="button" className="text-btn" onClick={clear}>
        Clear
      </button>
    </div>
  );
}