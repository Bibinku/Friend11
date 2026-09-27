import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import type { MatchMode } from '../types';
import { CREATE_MODES } from '../data/modes';
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
  const [mode, setMode] = useState<MatchMode>(CREATE_MODES[0]);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{ code?: string; message?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);

  const posting = isMember && profile ? { name: profile.username, avatarId: profile.avatarId } : { name: guest.username, avatarId: DEFAULT_AVATAR_ID };

  async function publish() {
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
    if (!c.ok || !m.ok) {
      setErrors({ code: c.ok ? undefined : c.error, message: m.ok ? undefined : m.error });
      return;
    }
    setErrors({});
    if (myRoom) setConfirmReplace(true);
    else void publish();
  }

  return (
    <section className="section page">
      <div className="container container-narrow">
        <div className="page-head">
          <h1>Create a match</h1>
          <p>Your room is public for exactly 10 minutes.</p>
        </div>

        <form className="card form-card" onSubmit={submit} noValidate>
          <div className="posting-as">
            <Avatar id={posting.avatarId} size={36} />
            <p>
              Posting as <strong>{posting.name}</strong>
              {!isMember && (
                <>
                  {' · '}
                  <button type="button" className="text-btn" onClick={() => openLogin()}>
                    Sign in to use your profile
                  </button>
                </>
              )}
            </p>
          </div>

          {myRoom && (
            <div className="notice" role="status">
              <p>
                You already have a live room (<strong>{myRoom.code}</strong>). Publishing a new one replaces it.
              </p>
              <Countdown room={myRoom} />
            </div>
          )}

          <div className="field-group">
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
              spellCheck={false}
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

          <fieldset className="field-group">
            <legend className="label">Match mode</legend>
            <div className="mode-options" role="radiogroup" aria-label="Match mode">
              {CREATE_MODES.map((m) => (
                <button key={m} type="button" role="radio" aria-checked={mode === m} className={`mode-option${mode === m ? ' is-selected' : ''}`} onClick={() => setMode(m)}>
                  {m}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="field-group">
            <label className="label" htmlFor="room-message">
              Give a message <span className="optional">(optional)</span>
            </label>
            <textarea
              id="room-message"
              className="field"
              rows={2}
              maxLength={ROOM_MESSAGE_MAX}
              placeholder="Friendlies only, no sweats…"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setErrors((p) => ({ ...p, message: undefined }));
              }}
              aria-describedby="room-message-hint"
            />
            <p id="room-message-hint" className="hint hint-row">
              <span>Shown on your room card. No sign-in needed.</span>
              <span>
                {message.length}/{ROOM_MESSAGE_MAX}
              </span>
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

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
            {busy && <Loader2 size={18} className="spin" aria-hidden="true" />}
            {myRoom ? 'Replace room' : 'Publish room'}
          </button>
          <p className="fine">
            Room codes are public. Players copy the code and enter it in eFootball themselves. See <Link to="/info/how-it-works">How it works</Link>.
          </p>
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