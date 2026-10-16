import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';
import type { MatchMode } from '../types';
import { CREATE_MODES, iconForMode } from '../data/modes';
import { DEFAULT_AVATAR_ID } from '../data/avatars';
import { ROOM_CODE_MAX, ROOM_MESSAGE_MAX, validateRoomCode, validateRoomMessage } from '../lib/validation';
import { useAuth } from '../context/AuthContext';
import { useMyRoom, useRooms } from '../context/RoomsContext';
import { useToast } from '../context/ToastContext';
import { useUI } from '../context/UIContext';
import { Avatar } from '../components/Avatar';
import { ConfirmModal } from '../components/ConfirmModal';
import { Countdown } from '../components/Countdown';

/** Create Match never requires an account — including the message field. */
export function Create() {
  const navigate = useNavigate();
  const showToast = useToast();
  const { isMember, profile } = useAuth();
  const { openLogin } = useUI();
  const { guest, createRoom } = useRooms();
  const myRoom = useMyRoom();

  const [code, setCode] = useState('');
  const [mode, setMode] = useState<MatchMode | ''>('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{ code?: string; mode?: string; message?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);

  const posting = isMember && profile ? { name: profile.username, avatarId: profile.avatarId } : { name: guest.username, avatarId: DEFAULT_AVATAR_ID };

  async function publish() {
    if (!mode) return; // guarded by submit() already; belt-and-braces, and narrows the type below
    setBusy(true);
    const replacing = myRoom != null;
    const res = await createRoom({ code, mode, message });
    setBusy(false);
    setConfirmReplace(false);
    if (!res.ok) {
      setErrors({ form: res.error });
      return;
    }
    showToast(replacing ? 'Room replaced. Live for 10 minutes.' : 'Your room is live for 10 minutes.', 'success');
    navigate('/join');
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const c = validateRoomCode(code);
    const m = validateRoomMessage(message);
    const modeError = mode ? undefined : 'Choose a match mode.';
    if (!c.ok || !m.ok || modeError) {
      setErrors({ code: c.ok ? undefined : c.error, mode: modeError, message: m.ok ? undefined : m.error });
      return;
    }
    setErrors({});
    if (myRoom) setConfirmReplace(true);
    else void publish();
  }

  return (
    <section className="section page create-page">
      <div className="container container-narrow">
        <header className="page-head rise" style={{ ['--d' as string]: '0ms' }}>
          <p className="eyebrow">New room</p>
          <h1>Create a match</h1>
          <p>Your room is public for exactly 10 minutes.</p>
        </header>

        <form className="create-form" onSubmit={submit} noValidate>
          <div className="posting-as rise" style={{ ['--d' as string]: '40ms' }}>
            <Avatar id={posting.avatarId} size={36} />
            <p>
              <span className="posting-label">Posting as</span>
              <strong>{posting.name}</strong>
            </p>
            {!isMember && (
              <button type="button" className="posting-action" onClick={() => openLogin()}>
                Sign in
              </button>
            )}
          </div>

          {myRoom && (
            <div className="notice rise" role="status" style={{ ['--d' as string]: '70ms' }}>
              <p>
                You already have a live room (<strong>{myRoom.code}</strong>). Publishing a new one replaces it.
              </p>
              <Countdown room={myRoom} />
            </div>
          )}

          <div className="form-block rise" style={{ ['--d' as string]: '100ms' }}>
            <label className="label" htmlFor="room-code">
              Room code
            </label>
            <input
              id="room-code"
              className="field field-code"
              value={code}
              maxLength={ROOM_CODE_MAX}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              placeholder="Your eFootball room code"
              onChange={(e) => {
                setCode(e.target.value);
                setErrors((p) => ({ ...p, code: undefined }));
              }}
              aria-invalid={errors.code ? true : undefined}
              aria-describedby={errors.code ? 'room-code-err' : undefined}
            />
            {errors.code && (
              <p id="room-code-err" className="form-error" role="alert">
                {errors.code}
              </p>
            )}
          </div>

          <fieldset className="form-block rise" style={{ ['--d' as string]: '130ms' }} aria-describedby={errors.mode ? 'room-mode-err' : undefined}>
            <legend className="label">Match mode</legend>
            <div className="mode-grid" role="radiogroup" aria-label="Match mode">
              {CREATE_MODES.map((m) => {
                const Icon = iconForMode(m);
                const selected = mode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`mode-tile${selected ? ' is-selected' : ''}`}
                    onClick={() => {
                      setMode(m);
                      setErrors((p) => ({ ...p, mode: undefined }));
                    }}
                  >
                    <span className="mode-tile-icon" aria-hidden="true">
                      <Icon size={18} strokeWidth={1.9} />
                    </span>
                    <span className="mode-tile-name">{m}</span>
                    <span className="mode-tile-check" aria-hidden="true">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.mode && (
              <p id="room-mode-err" className="form-error" role="alert">
                {errors.mode}
              </p>
            )}
          </fieldset>

          <div className="form-block rise" style={{ ['--d' as string]: '160ms' }}>
            <label className="label" htmlFor="room-message">
              Message <span className="optional">(optional)</span>
            </label>
            <div className="textarea-wrap">
              <textarea
                id="room-message"
                className="field"
                rows={3}
                maxLength={ROOM_MESSAGE_MAX}
                placeholder="Friendlies only, no sweats…"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setErrors((p) => ({ ...p, message: undefined }));
                }}
                aria-describedby="room-message-hint"
              />
              <span className="char-count" aria-hidden="true">
                {message.length}/{ROOM_MESSAGE_MAX}
              </span>
            </div>
            <p id="room-message-hint" className="hint">
              Shown on your room card. No sign-in needed.
            </p>
            {errors.message && (
              <p className="form-error" role="alert">
                {errors.message}
              </p>
            )}
          </div>

          {errors.form && (
            <p className="form-error banner" role="alert">
              {errors.form}
            </p>
          )}

          <div className="rise" style={{ ['--d' as string]: '190ms' }}>
            <button type="submit" className="btn btn-primary btn-lg btn-block btn-cta" disabled={busy}>
              {busy && <Loader2 size={18} className="spin" aria-hidden="true" />}
              {myRoom ? 'Replace room' : 'Publish room'}
            </button>
            <p className="fine">
              Room codes are public. Players copy the code and enter it in eFootball themselves. See <Link to="/info/how-it-works">How it works</Link>.
            </p>
          </div>
        </form>
      </div>

      <ConfirmModal
        open={confirmReplace}
        title="Replace your live room?"
        description="Your current room will be removed and the new one starts a fresh 10-minute timer."
        confirmLabel="Replace room"
        onConfirm={publish}
        onCancel={() => setConfirmReplace(false)}
      />
    </section>
  );
}