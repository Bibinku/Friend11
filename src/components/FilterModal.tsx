import { useFilteredRooms, useRoomFilters } from '../context/RoomFiltersContext';
import { Modal } from './Modal';
import { RoomFilters } from './RoomFilters';

/** The pop-up opened by the filter icon on the Home page. Changes apply as you make them. */
export function FilterModal() {
  const f = useRoomFilters();
  const { filtered } = useFilteredRooms();
  const n = filtered.length;

  return (
    <Modal open={f.filterOpen} onClose={f.closeFilter} title="Filter rooms" description="Show only the rooms you’re looking for.">
      <RoomFilters
        stacked
        search={f.search}
        onSearch={f.setSearch}
        mode={f.mode}
        onMode={f.setMode}
        country={f.country}
        onCountry={f.setCountry}
      />
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={f.clear} disabled={f.activeCount === 0}>
          Clear all
        </button>
        <button type="button" className="btn btn-primary" onClick={f.closeFilter}>
          {n === 0 ? 'Done' : `Show ${n} ${n === 1 ? 'room' : 'rooms'}`}
        </button>
      </div>
    </Modal>
  );
}