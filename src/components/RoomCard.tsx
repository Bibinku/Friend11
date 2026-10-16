import { useState } from 'react';
import { Check, Copy, Loader2, Lock } from 'lucide-react';
import type { MatchRoom } from '../types';
import { iconForMode } from '../data/modes';
import { flagFor } from '../data/countries';
import { copyText } from '../lib/clipboard';
import { isExpired } from '../lib/roomTime';
import { useClock, useRooms } from '../context/RoomsContext';
import { useToast } from '../context/ToastContext';
import { copyRoomCode } from '../services/roomService';
import { Avatar } from './Avatar';
import { Countdown } from './Countdown';

export function RoomCard({ room }: { room: MatchRoom }) {
  const now = useClock();
  const showToast = useToast();
  const { guest, refresh } = useRooms();
  const [busy, setBusy] = useState(false);
  const ModeIcon = iconForMode(room.mode);

  // Everything comes from the server (1-second refresh), so owner, copiers
  // and everyone else always agree.
  const copiedByMe = room.iCopied;
  const ownerSeesCopied = room.isMine && room.copiesUsed > 0;

  async function copy() {
    if (isExpired(room, now) || busy) return;
    if (room.isMine || copiedByMe || room.fullForMe) return;

    setBusy(true);
    const res = await copyRoomCode(room.id, guest.key);
    setBusy(false);
    if (!res.ok) {
      showToast(res.error ?? 'Couldn’t copy this code.', 'error');
      void refresh(); // someone else may have taken the last slot
      return;
    }
    const copied = res.code ? await copyText(res.code) : false;
    showToast(
      copied ? 'Code copied. Enter it in eFootball.' : 'Code saved to you, but your phone blocked auto-copy. Press and hold the code.',
      copied ? 'success' : 'error',
    );
    void refresh();
  }

  const showJoinedCount = true;

  let label = 'Copy Code';
  let icon = <Copy size={18} aria-hidden="true" />;
  let tone: 'primary' | 'success' | 'muted' | 'plain' = 'primary';
  let disabled = false;

  if (room.isMine) {
    disabled = true;
    if (ownerSeesCopied) {
      label = 'Copied';
      icon = <Check size={18} aria-hidden="true" />;
      tone = 'success';
    } else {
      label = 'Your Room';
      icon = <Lock size={16} aria-hidden="true" />;
      tone = 'plain';
    }
  } else if (copiedByMe) {
    label = 'Copied';
    icon = <Check size={18} aria-hidden="true" />;
    tone = 'success';
    disabled = true;
  } else if (room.fullForMe) {
    label = 'Already Copied';
    icon = <Lock size={16} aria-hidden="true" />;
    tone = 'muted';
    disabled = true;
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
      {showJoinedCount && (
        <p className="room-joined">
          {room.copiesUsed}/{room.copyLimit} joined
        </p>
      )}

      <button
        type="button"
        className={`btn btn-block${
          tone === 'success' ? ' btn-success' : tone === 'muted' ? ' btn-muted' : tone === 'plain' ? ' btn-secondary' : ' btn-primary'
        }`}
        onClick={() => void copy()}
        disabled={disabled || busy}
      >
        {busy ? <Loader2 size={18} className="spin" aria-hidden="true" /> : icon}
        {label}
      </button>
    </article>
  );
}