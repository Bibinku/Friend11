import { Link, NavLink } from 'react-router-dom';
import { LogIn, Menu, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useUI } from '../context/UIContext';
import { Avatar } from './Avatar';
import { Logo } from './Logo';

const NAV = [
  { to: '/', label: 'HOME', end: true },
  { to: '/create', label: 'CREATE', end: false },
  { to: '/join', label: 'JOIN', end: false },
];

export function Header({ onMenu }: { onMenu: () => void }) {
  const { theme, setTheme } = useTheme();
  const { restored, isSignedIn, profile } = useAuth();
  const { openLogin } = useUI();
  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <header className="header">
      <div className="container header-inner">
        <div className="header-left">
          <button type="button" className="icon-btn menu-btn" onClick={onMenu} aria-label="Open menu">
            <Menu size={22} aria-hidden="true" />
          </button>

          <Link to="/" className="brand" aria-label="FRIEND11 home">
            <Logo />
          </Link>
        </div>

        <nav className="nav-desktop" aria-label="Primary">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="nav-link">
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className="icon-btn theme-btn"
            onClick={() => setTheme(next)}
            aria-label={`Switch to ${next === 'light' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
          </button>

          {!restored ? (
            <span className="skeleton-circle" aria-hidden="true" />
          ) : isSignedIn ? (
            <Link to="/profile" className="profile-chip" aria-label="Your profile">
              <Avatar id={profile?.avatarId} size={34} />
              {profile?.onboarded && <span className="profile-chip-name">{profile.username}</span>}
            </Link>
          ) : (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => openLogin()}>
              <LogIn size={16} aria-hidden="true" />
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}