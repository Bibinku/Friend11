import { Clock } from 'lucide-react';
import type { MatchRoom } from '../types';
import { formatCountdown, remainingMs } from '../lib/roomTime';
import { useClock } from '../context/RoomsContext';

/** Live MM:SS for a room, derived from createdAt and the server-corrected clock. */
export function Countdown({ room }: { room: Pick<MatchRoom, 'createdAt'> }) {
  const ms = remainingMs(room, useClock());
  const label = formatCountdown(ms);
  return (
    <span className={`countdown${ms <= 60_000 ? ' is-low' : ''}`} role="timer" aria-label={`Expires in ${label}`}>
      <Clock size={14} aria-hidden="true" />
      {label}
    </span>
  );
}
