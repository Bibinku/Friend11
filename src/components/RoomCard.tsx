import { useState } from 'react';
import { Check, Copy, Loader2, Lock } from 'lucide-react';
import type { MatchRoom } from '../types';
import { iconForMode } from '../data/modes';
import { flagFor } from '../data/countries';
import { copyText } from '../lib/clipboard';
import { isExpired, formatCountdown } from '../lib/roomTime';
import { COPY_COOLDOWN_MS, lastCopyAt, markCopyNow } from '../lib/storage';
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
  const [copiedNow, setCopiedNow] = useState(false); // instant local feedback, ahead of the next poll
  const ModeIcon = iconForMode(room.mode);

  // "Full" is a plain fact about the room; "full FOR ME" (server-computed)
  // additionally excludes the owner and anyone who already has a slot — the
  // two groups who should see "Copied", never the greyed-out lockout.
  const roomFull = room.copiesUsed >= room.copyLimit;
  const mine = copiedNow || room.iCopied || (room.isMine && roomFull);
  const cooldownLeft = Math.max(0, COPY_COOLDOWN_MS - (now - (lastCopyAt() ?? -Infinity)));
  const onCooldown = !room.isMine && !mine && !room.fullForMe && cooldownLeft > 0;

  async function copy() {
    if (isExpired(room, now) || busy) return;
    if (room.isMine) {
      // Copying your own room is always free and unlimited — no server call.
      const ok = await copyText(room.code);
      if (!ok) return showToast('Couldn’t copy. Press and hold the code to copy it.', 'error');
      showToast('Copied', 'success');
      return;
    }
    if (mine || room.fullForMe) return; // button is disabled in these states anyway
    if (onCooldown) {
      showToast(`Please wait ${formatCountdown(cooldownLeft)} before copying another code.`, 'error');
      return;
    }

    setBusy(true);
    const res = await copyRoomCode(room.id, guest.key);
    setBusy(false);
    if (!res.ok) {
      showToast(res.error ?? 'Couldn’t copy this code.', 'error');
      return;
    }
    if (res.code) await copyText(res.code);
    if (res.roomFull) {
      showToast('This room just filled up — here’s the code anyway.', 'info');
    } else {
      showToast('Code copied. Enter it in eFootball.', 'success');
      markCopyNow();
    }
    setCopiedNow(true);
    void refresh(); // pull the fresh copies_used / list position promptly
  }

  const showJoinedCount = room.copyLimit > 1; // not meaningful for the two 1v1 modes

  let label = 'Copy Code';
  let icon = <Copy size={18} aria-hidden="true" />;
  let tone: 'primary' | 'success' | 'muted' = 'primary';
  let disabled = false;

  if (mine) {
    label = 'Copied';
    icon = <Check size={18} aria-hidden="true" />;
    tone = 'success';
    disabled = true;
  } else if (room.fullForMe) {
    label = 'Already Copied';
    icon = <Lock size={16} aria-hidden="true" />;
    tone = 'muted';
    disabled = true;
  } else if (onCooldown) {
    label = `Wait ${formatCountdown(cooldownLeft)}`;
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
        className={`btn btn-block${tone === 'success' ? ' btn-success' : tone === 'muted' ? ' btn-muted' : ' btn-primary'}`}
        onClick={() => void copy()}
        disabled={disabled || busy}
      >
        {busy ? <Loader2 size={18} className="spin" aria-hidden="true" /> : icon}
        {label}
      </button>
    </article>
  );
}