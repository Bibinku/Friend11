import { Search } from 'lucide-react';
import type { CountryName, MatchModeFilter } from '../types';
import { COUNTRIES } from '../data/countries';
import { FILTER_MODES } from '../data/modes';

interface RoomFiltersProps {
  search: string;
  onSearch: (v: string) => void;
  mode: MatchModeFilter;
  onMode: (v: MatchModeFilter) => void;
  country: CountryName | '';
  onCountry: (v: CountryName | '') => void;
  /** One field per row with visible labels — for the menu and the pop-up. */
  stacked?: boolean;
}

export function RoomFilters({ search, onSearch, mode, onMode, country, onCountry, stacked = false }: RoomFiltersProps) {
  const searchInput = (
    <label className="search-field">
      <span className="sr-only">Search by player or room code</span>
      <Search size={18} aria-hidden="true" />
      <input
        className="field"
        type="search"
        inputMode="search"
        autoComplete="off"
        placeholder="Search player or code"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />
    </label>
  );
  const modeSelect = (
    <select className="field" value={mode} onChange={(e) => onMode(e.target.value as MatchModeFilter)}>
      {FILTER_MODES.map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
    </select>
  );
  const countrySelect = (
    <select className="field" value={country} onChange={(e) => onCountry(e.target.value as CountryName | '')}>
      <option value="">All countries</option>
      {COUNTRIES.map((c) => (
        <option key={c.name} value={c.name}>
          {c.flag} {c.name}
        </option>
      ))}
    </select>
  );

  if (stacked) {
    return (
      <div className="filters filters-stacked">
        <div className="filter-group">
          <span className="label">Search</span>
          {searchInput}
        </div>
        <label className="filter-group">
          <span className="label">Mode</span>
          {modeSelect}
        </label>
        <label className="filter-group">
          <span className="label">Country</span>
          {countrySelect}
        </label>
      </div>
    );
  }

  return (
    <div className="filters">
      {searchInput}
      <label>
        <span className="sr-only">Match mode</span>
        {modeSelect}
      </label>
      <label>
        <span className="sr-only">Country</span>
        {countrySelect}
      </label>
    </div>
  );
}