import { NavLink, useLocation } from 'react-router-dom';
import { Home, PlusCircle, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useScrollIdle } from '../hooks/useScrollIdle';

const ITEMS: { to: string; label: string; icon: LucideIcon; end: boolean }[] = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/create', label: 'Create', icon: PlusCircle, end: false },
  { to: '/join', label: 'Join', icon: Users, end: false },
];

/**
 * Floating Home / Create / Join dock. It tucks itself below the screen while
 * the page scrolls and rises back once the page is still (see useScrollIdle);
 * all of the motion lives in CSS (`.dock` in app.css).
 */
export function BottomNav() {
  useScrollIdle();
  const { pathname } = useLocation();
  const { chatOpen } = useUI();
  const { isMember } = useAuth();

  const active = ITEMS.findIndex((i) => (i.end ? pathname === i.to : pathname === i.to || pathname.startsWith(`${i.to}/`)));
  const suppressed = chatOpen && isMember; // the chat sheet owns the bottom edge

  return (
    <div className={`dock-wrap${suppressed ? ' is-suppressed' : ''}`}>
      <nav className="dock" aria-label="Primary" style={{ ['--i' as string]: Math.max(active, 0) }}>
        <span className={`dock-pill${active < 0 ? ' is-hidden' : ''}`} aria-hidden="true" />
        {ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="dock-item">
            <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
