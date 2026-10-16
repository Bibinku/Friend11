import { useEffect } from 'react';

/** Desktop starts here. At this width and up the header links are used and the dock stays off. */
const DESKTOP_QUERY = '(min-width: 900px)';
/** How long the page must sit still before the floating navigation returns. */
const IDLE_MS = 180;
/** Small delay on first load so the navigation visibly rises into place. */
const INTRO_MS = 320;

/**
 * Phones and tablets only. Publishes the page's scroll state as `data-dock` on <html>:
 *   "down" → the page is scrolling (or just loaded): the bottom nav is tucked away
 *   "up"   → the page has been still for a moment: the bottom nav is out
 * On desktop the attribute is removed, so the dock and the Live Chat button never react.
 *
 * It is an attribute rather than React state on purpose: the dock and the Live Chat
 * button both key their CSS off it, so they move in lockstep and scrolling never
 * triggers a React re-render.
 */
export function useScrollIdle(): void {
  useEffect(() => {
    const root = document.documentElement;
    const desktop = window.matchMedia(DESKTOP_QUERY);
    let timer = 0;
    let lastY = window.scrollY;
    let up = false;
    let running = false;

    const set = (value: boolean) => {
      if (up === value) return;
      up = value;
      root.dataset.dock = value ? 'up' : 'down';
    };

    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 1) return; // layout/resize noise, not a real scroll
      lastY = y;
      set(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => set(true), IDLE_MS);
    };

    const start = () => {
      if (running) return;
      running = true;
      lastY = window.scrollY;
      up = false;
      root.dataset.dock = 'down';
      timer = window.setTimeout(() => set(true), INTRO_MS);
      window.addEventListener('scroll', onScroll, { passive: true });
    };

    const stop = () => {
      if (!running) return;
      running = false;
      window.clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
      up = false;
      delete root.dataset.dock;
    };

    const sync = () => (desktop.matches ? stop() : start());
    sync();
    desktop.addEventListener('change', sync);

    return () => {
      desktop.removeEventListener('change', sync);
      stop();
    };
  }, []);
}