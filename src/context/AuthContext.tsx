import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { CountryName, Profile, Result } from '../types';
import { getAuthRedirectUrl, initialAuthCallback, stripAuthErrorFromUrl, supabase } from '../lib/supabase';
import { friendlyAuthError } from '../lib/authErrors';
import { isCountry, validateEmail, validateUsername } from '../lib/validation';
import { logLogin } from '../lib/loginLog';
import { markSignInStarted, takeSignInStarted } from '../lib/storage';
import { AVATARS } from '../data/avatars';
import * as profiles from '../services/profileService';
import { useToast } from './ToastContext';

export interface AccountUser {
  id: string;
  email: string;
  createdAt: string;
}

type ProfileStatus = 'idle' | 'loading' | 'ready' | 'error';

interface AuthValue {
  /** False only until the stored/returning session has been restored. */
  restored: boolean;
  user: AccountUser | null;
  profile: Profile | null;
  profileStatus: ProfileStatus;
  profileError: string | null;
  isSignedIn: boolean;
  /** Signed in, but username/avatar haven't been chosen yet. */
  needsOnboarding: boolean;
  /** Signed in AND profile complete — required for Live Chat. */
  isMember: boolean;
  /** True while returning from Google / an email link and finishing sign-in. */
  callbackPending: boolean;
  /** A failed Google / email-link return, worded for the person. */
  callbackError: string | null;
  clearCallbackError: () => void;
  signInWithGoogle: () => Promise<Result>;
  sendMagicLink: (email: string) => Promise<Result>;
  signOut: () => Promise<void>;
  completeOnboarding: (username: string, avatarId: number, country: CountryName) => Promise<Result>;
  updateUsername: (username: string) => Promise<Result>;
  updateAvatar: (avatarId: number) => Promise<Result>;
  updateCountry: (country: CountryName) => Promise<Result>;
  deleteAccount: () => Promise<Result>;
  retryProfile: () => void;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

/** Evaluated once per page load: did this load follow a Google sign-in we started? */
const returnedFromSignIn = takeSignInStarted();

const validAvatar = (id: number) => AVATARS.some((a) => a.id === id);

export function AuthProvider({ children }: { children: ReactNode }) {
  const showToast = useToast();

  const [session, setSession] = useState<Session | null>(null);
  const [restored, setRestored] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('idle');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [callbackError, setCallbackError] = useState<string | null>(() =>
    initialAuthCallback.errorCode || initialAuthCallback.errorDescription
      ? friendlyAuthError(initialAuthCallback.errorCode, initialAuthCallback.errorDescription)
      : null,
  );

  const userId = session?.user.id ?? null;
  const email = session?.user.email ?? '';
  const createdAt = session?.user.created_at ?? '';

  /**
   * 1) Session restoration + auth events.
   *
   * IMPORTANT: this callback is SYNCHRONOUS. Supabase documents that other
   * Supabase calls must not be awaited inside it: the client holds an
   * internal lock while notifying subscribers (INITIAL_SESSION fires while
   * it is still processing the Google / magic-link redirect), and a query
   * awaited in here can wait on that same lock. So we only store the
   * session here and load the profile in an effect below, outside the
   * callback.
   */
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') setRestored(true);
    });
    // Belt and braces: never leave the UI waiting if INITIAL_SESSION is missed.
    supabase.auth
      .getSession()
      .then(({ data: d }) => setSession((prev) => prev ?? d.session))
      .catch(() => undefined)
      .finally(() => setRestored(true));
    return () => data.subscription.unsubscribe();
  }, []);

  // A failed return from Google / email link: tidy the address bar.
  useEffect(() => {
    if (initialAuthCallback.errorCode || initialAuthCallback.errorDescription) stripAuthErrorFromUrl();
  }, []);

  // Came back from Google / an email link but no session materialised. Say so
  // instead of silently staying logged out.
  //
  // This must only ever be checked ONCE, on the very first time `restored`
  // becomes true after this page loaded. Without the guard below, this
  // effect re-runs on every later change to `userId` too — including a
  // deliberate Logout or Delete Account, which also sets userId to null.
  // Since `initialAuthCallback` is captured once from the URL at page-load
  // time and doesn't change, that later re-run would still see "this page
  // load was a sign-in callback" and wrongly show this error after a normal
  // sign-out.
  const initialCallbackChecked = useRef(false);
  useEffect(() => {
    if (!restored || initialCallbackChecked.current) return;
    initialCallbackChecked.current = true;
    if (userId) return; // signed in fine — nothing to report
    const c = initialAuthCallback;
    if (c.isCallback && !c.errorCode && !c.errorDescription) {
      setCallbackError((prev) => prev ?? 'We couldn’t finish signing you in. Please try again.');
    } else if (returnedFromSignIn && !c.isCallback) {
      // Google sent the browser back with no tokens at all — the classic sign of
      // a redirect URL that isn't on Supabase's allow-list.
      setCallbackError((prev) => prev ?? 'Sign-in didn’t finish. Please try again. If it keeps happening, the site owner needs to check the sign-in redirect settings.');
    }
  }, [restored, userId]);

  /** 2) Profile loading — keyed on the immutable user id, outside the auth callback. */
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setProfileStatus('idle');
      setProfileError(null);
      return;
    }
    let cancelled = false;
    setProfileStatus('loading');
    setProfileError(null);
    void (async () => {
      let res = await profiles.fetchProfile(userId);
      if (!res.error && !res.profile) res = await profiles.createMissingProfile(userId);
      if (cancelled) return;
      if (res.error || !res.profile) {
        setProfile(null);
        setProfileError('We couldn’t load your profile. Check your connection and retry.');
        setProfileStatus('error');
        return;
      }
      setProfile(res.profile);
      setProfileStatus('ready');
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, retryTick]);

  // Optional Google-Sheets login log: once per sign-in return, after the profile is complete.
  const loggedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!initialAuthCallback.isCallback || !profile?.onboarded || !userId || loggedFor.current === userId) return;
    loggedFor.current = userId;
    logLogin({ username: profile.username, email });
  }, [profile, userId, email]);

  const signInWithGoogle = useCallback(async (): Promise<Result> => {
    markSignInStarted();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: getAuthRedirectUrl(), queryParams: { prompt: 'select_account' } },
    });
    if (error) return { ok: false, error: friendlyAuthError(error.code, error.message) };
    return { ok: true }; // the browser is now navigating to Google
  }, []);

  const sendMagicLink = useCallback(async (address: string): Promise<Result> => {
    const check = validateEmail(address);
    if (!check.ok) return check;
    const { error } = await supabase.auth.signInWithOtp({
      email: address.trim().toLowerCase(),
      options: { emailRedirectTo: getAuthRedirectUrl(), shouldCreateUser: true },
    });
    if (error) return { ok: false, error: friendlyAuthError(error.code, error.message) };
    return { ok: true };
  }, []);

  /** Logout ends this device's session only. It never touches account data. */
  const signOut = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
    setSession(null);
    showToast('Signed out');
  }, [showToast]);

  const completeOnboarding = useCallback(
    async (username: string, avatarId: number, country: CountryName): Promise<Result> => {
      if (!userId || !profile) return { ok: false, error: 'Sign in first.' };
      const check = validateUsername(username);
      if (!check.ok) return check;
      if (!validAvatar(avatarId)) return { ok: false, error: 'Pick one of the avatars.' };
      if (!isCountry(country)) return { ok: false, error: 'Pick your country.' };
      const res = await profiles.saveProfile(userId, { username, avatarId, country, onboarded: true });
      if (!res.ok) return res;
      setProfile({ ...profile, username: username.trim(), avatarId, country, onboarded: true });
      showToast('Profile created — welcome to FRIEND11', 'success');
      return { ok: true };
    },
    [userId, profile, showToast],
  );

  const updateUsername = useCallback(
    async (username: string): Promise<Result> => {
      if (!userId || !profile) return { ok: false, error: 'Sign in first.' };
      const check = validateUsername(username);
      if (!check.ok) return check;
      const res = await profiles.saveProfile(userId, { username });
      if (!res.ok) return res;
      setProfile({ ...profile, username: username.trim() });
      showToast('Username updated', 'success');
      return { ok: true };
    },
    [userId, profile, showToast],
  );

  const updateAvatar = useCallback(
    async (avatarId: number): Promise<Result> => {
      if (!userId || !profile) return { ok: false, error: 'Sign in first.' };
      if (!validAvatar(avatarId)) return { ok: false, error: 'Pick one of the avatars.' };
      const res = await profiles.saveProfile(userId, { avatarId });
      if (!res.ok) return res;
      setProfile({ ...profile, avatarId });
      showToast('Profile picture updated', 'success');
      return { ok: true };
    },
    [userId, profile, showToast],
  );

  const updateCountry = useCallback(
    async (country: CountryName): Promise<Result> => {
      if (!userId || !profile) return { ok: false, error: 'Sign in first.' };
      if (!isCountry(country)) return { ok: false, error: 'Pick a valid country.' };
      const res = await profiles.saveProfile(userId, { country });
      if (!res.ok) return res;
      setProfile({ ...profile, country });
      showToast('Country updated', 'success');
      return { ok: true };
    },
    [userId, profile, showToast],
  );

  const deleteAccount = useCallback(async (): Promise<Result> => {
    const res = await profiles.deleteAccountOnServer();
    if (!res.ok) return res;
    await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
    setSession(null);
    showToast('Your account was deleted', 'success');
    return { ok: true };
  }, [showToast]);

  const user = useMemo<AccountUser | null>(() => (userId ? { id: userId, email, createdAt } : null), [userId, email, createdAt]);
  const isSignedIn = user !== null;
  const needsOnboarding = isSignedIn && profileStatus === 'ready' && profile !== null && !profile.onboarded;
  const isMember = isSignedIn && profileStatus === 'ready' && profile !== null && profile.onboarded;
  const callbackPending =
    initialAuthCallback.isCallback &&
    !initialAuthCallback.errorCode &&
    !initialAuthCallback.errorDescription &&
    (!restored || (isSignedIn && (profileStatus === 'idle' || profileStatus === 'loading')));

  const clearCallbackError = useCallback(() => setCallbackError(null), []);
  const retryProfile = useCallback(() => setRetryTick((n) => n + 1), []);

  const value = useMemo<AuthValue>(
    () => ({
      restored,
      user,
      profile,
      profileStatus,
      profileError,
      isSignedIn,
      needsOnboarding,
      isMember,
      callbackPending,
      callbackError,
      clearCallbackError,
      signInWithGoogle,
      sendMagicLink,
      signOut,
      completeOnboarding,
      updateUsername,
      updateAvatar,
      updateCountry,
      deleteAccount,
      retryProfile,
    }),
    [
      restored, user, profile, profileStatus, profileError, isSignedIn, needsOnboarding, isMember, callbackPending,
      callbackError, clearCallbackError, signInWithGoogle, sendMagicLink, signOut, completeOnboarding,
      updateUsername, updateAvatar, updateCountry, deleteAccount, retryProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}