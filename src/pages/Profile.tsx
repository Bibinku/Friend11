import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Clock, Globe, ImageIcon, LogOut, PencilLine, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMyRoom, useRooms } from '../context/RoomsContext';
import { useToast } from '../context/ToastContext';
import { useUI } from '../context/UIContext';
import { flagFor } from '../data/countries';
import { Avatar } from '../components/Avatar';
import { AvatarPickerModal } from '../components/AvatarPickerModal';
import { CountryModal } from '../components/CountryModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { Countdown } from '../components/Countdown';
import { UsernameModal } from '../components/UsernameModal';

export function Profile() {
  const { restored, user, profile, profileStatus, isMember, signOut, updateAvatar, updateUsername, updateCountry, deleteAccount, retryProfile } = useAuth();
  const { openLogin } = useUI();
  const { deleteMyRoom } = useRooms();
  const myRoom = useMyRoom();
  const showToast = useToast();

  const [avatarOpen, setAvatarOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [deleteRoomOpen, setDeleteRoomOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  if (!restored || (user && profileStatus === 'loading')) {
    return (
      <section className="section page">
        <div className="container container-narrow">
          <div className="card skeleton-card" aria-busy="true" aria-label="Loading profile" />
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="section page">
        <div className="container container-narrow">
          <div className="card empty-card">
            <h1>Your profile</h1>
            <p>Sign in to see your profile, change your avatar and username, and use Live Chat.</p>
            <button type="button" className="btn btn-primary btn-lg" onClick={() => openLogin()}>
              Sign in
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!isMember || !profile) {
    return (
      <section className="section page">
        <div className="container container-narrow">
          <div className="card empty-card">
            <h1>Your profile</h1>
            <p>{profileStatus === 'error' ? 'We couldn’t load your profile.' : 'Finish setting up your profile to continue.'}</p>
            {profileStatus === 'error' && (
              <button type="button" className="btn btn-primary" onClick={retryProfile}>
                Try again
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  const created = new Date(user.createdAt);
  const createdLabel = Number.isNaN(created.getTime()) ? '—' : created.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

    const rise = (ms: number) => ({ ['--d' as string]: `${ms}ms` });

  return (
    <section className="section page profile-page">
      <div className="container container-narrow">
        <header className="pf-hero rise" style={rise(0)}>
          <button type="button" className="avatar-edit" onClick={() => setAvatarOpen(true)} aria-label="Change profile picture">
            <Avatar id={profile.avatarId} size={88} className="avatar-lg" />
            <span className="avatar-edit-badge" aria-hidden="true">
              <PencilLine size={12} strokeWidth={2.2} />
            </span>
          </button>
          <h1>{profile.username}</h1>
          <p className="pf-email">{user.email || '—'}</p>
          <div className="pf-pills">
            <span className="pf-pill">{profile.country ? `${flagFor(profile.country)} ${profile.country}` : 'Country not set'}</span>
            <span className="pf-pill">Member since {createdLabel}</span>
          </div>
        </header>

        <section className="pf-card rise" style={rise(60)} aria-labelledby="active-room-h">
          <div className="pf-card-head">
            <h2 id="active-room-h" className="pf-title">
              Active room
            </h2>
            {myRoom && <Countdown room={myRoom} />}
          </div>
          {myRoom ? (
            <>
              <p className="pf-code">{myRoom.code}</p>
              <p className="pf-sub">
                {myRoom.mode}
                {myRoom.country ? ` · ${flagFor(myRoom.country)} ${myRoom.country}` : ''}
              </p>
              <button type="button" className="pf-btn" onClick={() => setDeleteRoomOpen(true)}>
                <Trash2 size={16} aria-hidden="true" /> Delete room
              </button>
            </>
          ) : (
            <>
              <p className="pf-empty">
                <Clock size={15} aria-hidden="true" /> You don’t have a live room.
              </p>
              <Link to="/create" className="pf-btn">
                Create a match
              </Link>
            </>
          )}
        </section>

        <h2 className="pf-label rise" style={rise(110)}>
          Account
        </h2>
        <div className="pf-list rise" style={rise(120)}>
          <button type="button" className="pf-row" onClick={() => setAvatarOpen(true)}>
            <span className="pf-row-icon" aria-hidden="true">
              <ImageIcon size={16} strokeWidth={1.9} />
            </span>
            <span className="pf-row-label">Change Profile Picture</span>
            <ChevronRight size={16} className="pf-row-chevron" aria-hidden="true" />
          </button>
          <button type="button" className="pf-row" onClick={() => setNameOpen(true)}>
            <span className="pf-row-icon" aria-hidden="true">
              <PencilLine size={16} strokeWidth={1.9} />
            </span>
            <span className="pf-row-label">Change Username</span>
            <ChevronRight size={16} className="pf-row-chevron" aria-hidden="true" />
          </button>
          <button type="button" className="pf-row" onClick={() => setCountryOpen(true)}>
            <span className="pf-row-icon" aria-hidden="true">
              <Globe size={16} strokeWidth={1.9} />
            </span>
            <span className="pf-row-label">Change Country</span>
            <ChevronRight size={16} className="pf-row-chevron" aria-hidden="true" />
          </button>
          <button type="button" className="pf-row" onClick={() => void signOut()}>
            <span className="pf-row-icon" aria-hidden="true">
              <LogOut size={16} strokeWidth={1.9} />
            </span>
            <span className="pf-row-label">Logout</span>
          </button>
        </div>

        <div className="pf-delete rise" style={rise(180)}>
          <div className="pf-delete-text">
            <h2>Delete account</h2>
            <p>Permanently removes your account and data.</p>
          </div>
          <button type="button" className="pf-delete-btn" onClick={() => setDeleteAccountOpen(true)} aria-label="Delete account">
            Delete
          </button>
        </div>
      </div>

      <AvatarPickerModal open={avatarOpen} currentId={profile.avatarId} onClose={() => setAvatarOpen(false)} onSave={async (id) => (await updateAvatar(id)).ok} />
      <UsernameModal open={nameOpen} current={profile.username} onClose={() => setNameOpen(false)} onSave={updateUsername} />
      <CountryModal open={countryOpen} current={profile.country} onClose={() => setCountryOpen(false)} onSave={updateCountry} />

      <ConfirmModal
        open={deleteRoomOpen}
        title="Delete your room?"
        description="It will disappear from Join Match immediately."
        confirmLabel="Delete Room"
        tone="danger"
        onCancel={() => setDeleteRoomOpen(false)}
        onConfirm={async () => {
          const res = await deleteMyRoom();
          setDeleteRoomOpen(false);
          showToast(res.ok ? 'Room deleted' : res.error ?? 'Couldn’t delete the room.', res.ok ? 'success' : 'error');
        }}
      />
      <ConfirmModal
        open={deleteAccountOpen}
        title="Delete your account?"
        description="This permanently deletes your account, profile, rooms and messages, then signs you out. It can’t be undone."
        confirmLabel="Delete Account"
        tone="danger"
        onCancel={() => setDeleteAccountOpen(false)}
        onConfirm={async () => {
          const res = await deleteAccount();
          setDeleteAccountOpen(false);
          if (!res.ok) showToast(res.error ?? 'Couldn’t delete your account.', 'error');
        }}
      />
    </section>
  );
}