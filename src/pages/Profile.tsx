import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, ImageIcon, LogOut, PencilLine, Trash2 } from 'lucide-react';
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

  return (
    <section className="section page">
      <div className="container container-narrow">
        <div className="card profile-hero">
          <Avatar id={profile.avatarId} size={96} className="avatar-lg" />
          <div>
            <h1>{profile.username}</h1>
            <p>{user.email || '—'}</p>
            <p className="profile-since">Member since {createdLabel}</p>
            <p className="profile-since">{profile.country ? `${flagFor(profile.country)} ${profile.country}` : 'Country not set'}</p>
          </div>
        </div>

        <div className="card">
          <div className="card-row">
            <h2>Active room</h2>
            {myRoom && <Countdown room={myRoom} />}
          </div>
          {myRoom ? (
            <>
              <p className="room-code room-code-sm">{myRoom.code}</p>
              <p className="hint">
                {myRoom.mode}
                {myRoom.country ? ` · ${flagFor(myRoom.country)} ${myRoom.country}` : ''}
              </p>
              <button type="button" className="btn btn-secondary btn-block" onClick={() => setDeleteRoomOpen(true)}>
                <Trash2 size={18} aria-hidden="true" /> Delete Room
              </button>
            </>
          ) : (
            <>
              <p className="hint">You don’t have a live room.</p>
              <Link to="/create" className="btn btn-secondary btn-block">
                Create a match
              </Link>
            </>
          )}
        </div>

        <div className="card action-list">
          <button type="button" className="list-btn" onClick={() => setAvatarOpen(true)}>
            <ImageIcon size={20} aria-hidden="true" /> Change Profile Picture
          </button>
          <button type="button" className="list-btn" onClick={() => setNameOpen(true)}>
            <PencilLine size={20} aria-hidden="true" /> Change Username
          </button>
          <button type="button" className="list-btn" onClick={() => setCountryOpen(true)}>
            <Globe size={20} aria-hidden="true" /> Change Country
          </button>
          <button type="button" className="list-btn" onClick={() => void signOut()}>
            <LogOut size={20} aria-hidden="true" /> Logout
          </button>
        </div>

        <div className="card danger-zone">
          <h2>Delete account</h2>
          <p className="hint">Permanently removes your account, profile, rooms and chat messages. This can’t be undone.</p>
          <button type="button" className="btn btn-danger btn-block" onClick={() => setDeleteAccountOpen(true)}>
            Delete Account
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