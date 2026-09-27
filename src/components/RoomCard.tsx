import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { MatchRoom } from '../types';
import { iconForMode } from '../data/modes';
import { flagFor } from '../data/countries';
import { copyText } from '../lib/clipboard';
import { isExpired } from '../lib/roomTime';
import { useClock } from '../context/RoomsContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from './Avatar';
import { Countdown } from './Countdown';

export function RoomCard({ room }: { room: MatchRoom }) {
  const now = useClock();
  const showToast = useToast();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const ModeIcon = iconForMode(room.mode);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    if (isExpired(room, now)) {
      showToast('This room has expired.', 'error');
      return;
    }
    // Copying never touches the room or its timer.
    const ok = await copyText(room.code);
    if (!ok) {
      showToast('Couldn’t copy. Press and hold the code to copy it.', 'error');
      return;
    }
    setCopied(true);
    showToast('Code copied. Enter it in eFootball.', 'success');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <article className={`room-card${room.isMine ? ' is-mine' : ''}`}>
      <div className="room-top">
        <span className="chip">
          <ModeIcon size={14} aria-hidden="true" />
          {room.mode}
        </span>
        <Countdown room={room} />
      </div>

      <p className="room-code" aria-label={`Room code ${room.code}`}>
        {room.code}
      </p>

      <div className="room-meta">
        <span className="room-host">
          <Avatar id={room.avatarId} size={28} />
          <span className="room-host-name">{room.username}</span>
          {room.isMine && <span className="badge">You</span>}
        </span>
        {room.country && (
          <span className="room-country">
            <span aria-hidden="true">{flagFor(room.country)}</span> {room.country}
          </span>
        )}
      </div>

      {room.message && <p className="room-message">{room.message}</p>}

      <button type="button" className={`btn ${copied ? 'btn-success' : 'btn-primary'} btn-block`} onClick={copy}>
        {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
        {copied ? 'Copied' : 'Copy Code'}
      </button>
    </article>
  );
}