import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, LogIn, MessageCircle, Moon, PlusCircle, Search, Sun, UserRound, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useUI } from '../context/UIContext';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { INFO_LINKS } from '../data/site';
import { Logo } from './Logo';

export function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useFocusTrap<HTMLElement>(open);
  const { theme, setTheme } = useTheme();
  const { isSignedIn } = useAuth();
  const { openLogin, requestChat } = useUI();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('scroll-locked');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('scroll-locked');
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Menu" ref={ref} tabIndex={-1}>
        <div className="drawer-top">
          <Logo />
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close menu">
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        <nav className="drawer-nav" aria-label="Main">
          <NavLink to="/" end className="drawer-link" onClick={onClose}>
            <Home size={20} aria-hidden="true" /> Home
          </NavLink>
          <NavLink to="/create" className="drawer-link" onClick={onClose}>
            <PlusCircle size={20} aria-hidden="true" /> Create Match
          </NavLink>
          <NavLink to="/join" className="drawer-link" onClick={onClose}>
            <Search size={20} aria-hidden="true" /> Join Match
          </NavLink>
          <button
            type="button"
            className="drawer-link"
            onClick={() => {
              onClose();
              requestChat();
            }}
          >
            <MessageCircle size={20} aria-hidden="true" /> Live Chat
          </button>
          {isSignedIn ? (
            <NavLink to="/profile" className="drawer-link" onClick={onClose}>
              <UserRound size={20} aria-hidden="true" /> Profile
            </NavLink>
          ) : (
            <button
              type="button"
              className="drawer-link"
              onClick={() => {
                onClose();
                openLogin();
              }}
            >
              <LogIn size={20} aria-hidden="true" /> Sign in
            </button>
          )}
        </nav>

        <div className="drawer-section">
          <p className="drawer-heading">Appearance</p>
          <div className="segmented" role="group" aria-label="Theme">
            <button type="button" aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>
              <Sun size={16} aria-hidden="true" /> Light Mode
            </button>
            <button type="button" aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>
              <Moon size={16} aria-hidden="true" /> Dark Mode
            </button>
          </div>
        </div>

        <div className="drawer-section">
          <p className="drawer-heading">Information</p>
          <ul className="drawer-info">
            {INFO_LINKS.map((l) => (
              <li key={l.slug}>
                <NavLink to={`/info/${l.slug}`} onClick={onClose}>
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
