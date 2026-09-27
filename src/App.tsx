import { useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { useUI } from './context/UIContext';
import { takeAfterLogin } from './lib/storage';
import { Header } from './components/Header';
import { Drawer } from './components/Drawer';
import { Footer } from './components/Footer';
import { LoginModal } from './components/LoginModal';
import { OnboardingModal } from './components/OnboardingModal';
import { ChatWidget } from './components/ChatWidget';
import { Home } from './pages/Home';
import { Join } from './pages/Join';
import { Create } from './pages/Create';
import { Profile } from './pages/Profile';
import { Info } from './pages/Info';
import { NotFound } from './pages/NotFound';

export default function App() {
  const auth = useAuth();
  const { openLogin, closeLogin, openChat } = useUI();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // A failed Google / email-link return: show why, with sign-in ready to retry.
  useEffect(() => {
    if (auth.callbackError) openLogin();
  }, [auth.callbackError, openLogin]);

  // Signed in (Google or email): the sign-in dialog is done.
  useEffect(() => {
    if (auth.isSignedIn) closeLogin();
  }, [auth.isSignedIn, closeLogin]);

  // Tapped Live Chat while signed out → after signing in, land in the chat.
  useEffect(() => {
    if (auth.isMember && takeAfterLogin() === 'chat') openChat();
  }, [auth.isMember, openChat]);

  return (
    <div className="app">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Header onMenu={() => setMenuOpen(true)} />

      {auth.isSignedIn && auth.profileStatus === 'error' && (
        <div className="banner-bar" role="alert">
          <span>{auth.profileError}</span>
          <button type="button" className="text-btn" onClick={auth.retryProfile}>
            Retry
          </button>
          <button type="button" className="text-btn" onClick={() => void auth.signOut()}>
            Sign out
          </button>
        </div>
      )}

      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/join" element={<Join />} />
          <Route path="/create" element={<Create />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/info/:slug" element={<Info />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      <LoginModal />
      <OnboardingModal />
      <ChatWidget />

      {auth.callbackPending && (
        <div className="signing-in" role="status" aria-live="polite">
          <Loader2 size={32} className="spin" aria-hidden="true" />
          <p>Signing you in…</p>
        </div>
      )}
    </div>
  );
}
